// ════════════════════════════════════════════════════════════════════
//  Fine Print — Shared analysis core
//  Hardened for reliability: verbatim verification, coverage detection,
//  input validation, deterministic scoring, honest confidence signaling.
// ════════════════════════════════════════════════════════════════════

export const MODEL = "claude-sonnet-4-5";
export const MAX_TOKENS = 8192;

// ── System prompt: calibrated, honest, anti-hallucination ──
export const SYSTEM_PROMPT = `You are an expert contract analyst helping everyday people understand legal agreements they are about to sign. You provide legal INFORMATION, never legal advice.

YOUR JOB: Read the contract, extract every clause, score its risk, explain it plainly, and identify standard protections that are missing.

ANTI-HALLUCINATION RULES (CRITICAL):
- originalText MUST be copied EXACTLY, character-for-character, from the contract provided. Never paraphrase, summarize, or invent quotes. If you cannot quote it exactly, do not include the clause.
- Never invent clauses that are not present in the text.
- If the document is NOT a contract (e.g. a recipe, article, receipt, random text), set "isContract" to false and explain why in "notReason". Do not fabricate an analysis.
- If text is cut off, garbled, or unreadable, note it honestly rather than guessing.

RISK CALIBRATION (most clauses in most contracts are standard — do not over-flag):
- RED: genuinely one-sided clauses that remove standard protections, impose unusual penalties, waive liability entirely, grant overly broad rights, allow no-notice entry, permit property seizure without process, or create perpetual obligations with no exclusions.
- YELLOW: clauses that deviate from typical practice or are stricter than average but not severe (mandatory arbitration, auto-renewal without reminder, broad-but-bounded non-competes).
- GREEN: standard, balanced, expected clauses. The majority of clauses should be green.

CONFIDENCE: For each clause, include a "confidence" field (0.0-1.0) reflecting how certain you are about the risk assessment. Lower it when the clause is ambiguous, jurisdiction-dependent, or you're uncertain.

MISSING CLAUSES: Only flag "critical" when absence creates real financial/legal exposure. Use "recommended" for best-practice gaps.

OUTPUT: Return ONLY a valid JSON object. No markdown, no backticks, no text outside the JSON. Keep all string fields concise (1-2 sentences) to avoid exceeding token limits.`;

// ── Build the analysis prompt ──
export function buildAnalyzePrompt(contractType, text) {
  const typeLine = (!contractType || contractType === "auto")
    ? 'First determine the contract type: "lease", "nda", "employment", "freelance", "tos", or "other".'
    : 'The user indicates this is a "' + contractType + '" contract. Verify and proceed.';

  const body = text
    ? "\n\nCONTRACT TEXT (analyze exactly this — quote only from here):\n\"\"\"\n" + text + "\n\"\"\""
    : "\n\nThe contract is in the attached document/image(s). Quote only text that actually appears there.";

  return `${typeLine}

Return ONLY this JSON structure (no markdown fences):

{
  "isContract": true,
  "notReason": "",
  "contractType": "lease",
  "confidence": 0.9,
  "documentNote": "",
  "clauses": [
    {
      "id": 1,
      "category": "entry_rights",
      "title": "Short clause name",
      "risk": "red",
      "confidence": 0.85,
      "originalText": "EXACT verbatim quote copied from the contract",
      "explanation": "Plain-English meaning for a non-lawyer, 1-2 sentences.",
      "comparisonNote": "How this compares to standard practice, 1 sentence."
    }
  ],
  "missingClauses": [
    {
      "category": "deposit_return",
      "title": "Name of the missing protection",
      "severity": "critical",
      "standardLanguage": "What a fair contract usually says here, 1 sentence.",
      "whyItMatters": "Why its absence is risky, 1 sentence."
    }
  ]
}

RULES:
- If NOT a contract: set "isContract": false, fill "notReason", leave clauses/missingClauses empty.
- Extract EVERY distinct clause/section. Do not skip any.
- originalText: copy EXACTLY from the source. This is verified programmatically — invented quotes will be rejected.
- Use "documentNote" to flag anything unusual: text appears truncated, pages may be missing, image unclear, etc.
- Score most clauses GREEN. Reserve RED for genuinely harmful terms.
- For "${contractType === "auto" ? "the detected type" : contractType}", compare against what a fair version should contain.${body}`;
}

// ── Call Claude with retry + timeout ──
export async function callClaudeWithRetry(opts) {
  const { apiKey, system, messages, maxTokens = MAX_TOKENS, pdf = false, maxRetries = 2, temperature = 0 } = opts;
  let lastErr;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const headers = {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      };
      if (pdf) headers["anthropic-beta"] = "pdfs-2024-09-25";

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers,
        body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, temperature, system, messages }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (resp.status === 429 || resp.status === 529) {
        // Rate limited / overloaded — backoff and retry
        lastErr = new Error("Service busy (HTTP " + resp.status + ")");
        await sleep(1000 * (attempt + 1));
        continue;
      }
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error("Analysis service error (HTTP " + resp.status + "): " + t.slice(0, 200));
      }

      const data = await resp.json();
      const text = data.content?.[0]?.text || "";
      const stopReason = data.stop_reason;
      console.log("[claude] attempt", attempt + 1, "stop_reason:", stopReason, "chars:", text.length);
      return { text, stopReason, truncated: stopReason === "max_tokens" };
    } catch (err) {
      lastErr = err;
      if (err.name === "AbortError") lastErr = new Error("Analysis timed out. Try a shorter document or paste the text directly.");
      if (attempt < maxRetries) { await sleep(800 * (attempt + 1)); continue; }
    }
  }
  throw lastErr || new Error("Analysis failed after retries");
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ════════════════════════════════════════════════════════════════════
//  JSON parsing + recovery (handles truncated responses)
// ════════════════════════════════════════════════════════════════════
export function parseAnalysis(raw, sourceText) {
  if (!raw || !raw.trim()) throw new Error("The analysis service returned an empty response. Please try again.");

  let parsed = tryParse(raw);
  if (!parsed) parsed = tryParse(extractBraces(raw));
  if (!parsed) parsed = repairTruncated(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Could not read the analysis result. Please try again.");
  }

  return normalize(parsed, sourceText);
}

function tryParse(s) {
  if (!s) return null;
  try { const t = s.trim(); return t.startsWith("{") ? JSON.parse(t) : null; } catch { return null; }
}

function extractBraces(raw) {
  const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
  return (s !== -1 && e > s) ? raw.slice(s, e + 1) : null;
}

function repairTruncated(raw) {
  const s = raw.indexOf("{");
  if (s === -1) return null;
  const str = raw.slice(s);

  const ctMatch = str.match(/"contractType"\s*:\s*"([^"]+)"/);
  const confMatch = str.match(/"confidence"\s*:\s*([\d.]+)/);
  const isContractMatch = str.match(/"isContract"\s*:\s*(true|false)/);
  const docNoteMatch = str.match(/"documentNote"\s*:\s*"([^"]*)"/);

  const clauseHeader = str.match(/"clauses"\s*:\s*\[/);
  const gapHeader = str.match(/"missingClauses"\s*:\s*\[/);

  let clauses = [], gaps = [];
  if (clauseHeader) {
    const cs = str.indexOf(clauseHeader[0]) + clauseHeader[0].length;
    const ce = gapHeader ? str.indexOf(gapHeader[0]) : str.length;
    clauses = extractObjects(str.slice(cs, ce));
  }
  if (gapHeader) {
    const gs = str.indexOf(gapHeader[0]) + gapHeader[0].length;
    gaps = extractObjects(str.slice(gs));
  }

  return {
    isContract: isContractMatch ? isContractMatch[1] === "true" : true,
    contractType: ctMatch?.[1] || "unknown",
    confidence: parseFloat(confMatch?.[1] || "0.7"),
    documentNote: docNoteMatch?.[1] || "",
    _wasTruncated: true,
    clauses: clauses.map(safeJSON).filter(Boolean),
    missingClauses: gaps.map(safeJSON).filter(Boolean),
  };
}

function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }

function extractObjects(s) {
  const out = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") { if (depth === 0) start = i; depth++; }
    else if (c === "}") { depth--; if (depth === 0 && start !== -1) { out.push(s.slice(start, i + 1)); start = -1; } }
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════
//  Normalize + VERIFY (verbatim quote check against source)
// ════════════════════════════════════════════════════════════════════
function normalize(parsed, sourceText) {
  const result = {
    isContract: parsed.isContract !== false,
    notReason: String(parsed.notReason || ""),
    contractType: parsed.contractType || "unknown",
    confidence: clampNum(parsed.confidence, 0.7),
    documentNote: String(parsed.documentNote || ""),
    wasTruncated: parsed._wasTruncated === true,
    clauses: [],
    missingClauses: [],
  };

  // Not a contract — short-circuit
  if (!result.isContract) return result;

  // Normalize clauses + verify quotes
  const normText = sourceText ? normalizeForMatch(sourceText) : null;
  let unverified = 0;

  result.clauses = (Array.isArray(parsed.clauses) ? parsed.clauses : [])
    .filter(c => c && c.title && ["red", "yellow", "green"].includes(c.risk))
    .map((c, i) => {
      const originalText = String(c.originalText || "");
      // Verify the quote actually appears in the source (only when we have text)
      let verified = true;
      if (normText && originalText.length > 12) {
        verified = normText.includes(normalizeForMatch(originalText).slice(0, 60));
        if (!verified) unverified++;
      }
      return {
        id: c.id || i + 1,
        category: c.category || "general",
        title: String(c.title),
        risk: c.risk,
        confidence: clampNum(c.confidence, 0.8),
        originalText,
        verified,
        explanation: String(c.explanation || ""),
        comparisonNote: String(c.comparisonNote || ""),
      };
    });

  result.unverifiedCount = unverified;

  result.missingClauses = (Array.isArray(parsed.missingClauses) ? parsed.missingClauses : [])
    .filter(g => g && g.title)
    .map(g => ({
      category: g.category || "general",
      title: String(g.title),
      severity: g.severity === "critical" ? "critical" : "recommended",
      standardLanguage: String(g.standardLanguage || ""),
      whyItMatters: String(g.whyItMatters || ""),
    }));

  return result;
}

function clampNum(n, fallback) {
  const x = typeof n === "number" ? n : parseFloat(n);
  if (isNaN(x)) return fallback;
  return Math.max(0, Math.min(1, x));
}

// Normalize text for fuzzy verbatim matching: collapse whitespace, lowercase,
// strip smart quotes & punctuation variance the LLM tends to "fix"
function normalizeForMatch(s) {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")  // smart quotes -> '
    .replace(/[^a-z0-9'$%.\s]/g, " ")               // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

// ── Input validation ──
export function validateTextInput(text) {
  if (!text || typeof text !== "string") return "No text provided.";
  const trimmed = text.trim();
  if (trimmed.length < 100) return "This text is too short to be a contract (need at least 100 characters).";
  if (trimmed.length > 200000) return "This document is very large. Please paste the relevant section, or split it.";
  return null; // valid
}

// ════════════════════════════════════════════════════════════════════
//  SELF-CONSISTENCY RECONCILIATION (deep-check mode)
//  Runs analysis twice; reconciles into one result where per-clause
//  agreement = confidence, disagreement = honest "uncertain" flag.
// ════════════════════════════════════════════════════════════════════
//
//  Design notes (for the reliability doc & interviews):
//  - Run A is temperature 0 (the "primary" answer).
//  - Run B is temperature ~0.4 so it can genuinely diverge; at temp 0 both
//    runs are near-identical and the check is theater.
//  - We match clauses across runs by fuzzy title/category similarity, not
//    by index (the two runs won't enumerate clauses in the same order).
//  - Agreement on risk  -> keep risk, boost confidence.
//  - Disagreement on risk -> keep the MORE CAUTIOUS risk, mark
//    consensus:"disagree", drop confidence. Safer to over-warn than miss.
//  - Clause found in only one run -> consensus:"partial", lower confidence.

export function reconcileAnalyses(a, b) {
  // If either run says "not a contract", trust that (fail safe)
  if (a.isContract === false) return a;
  if (b.isContract === false) return b;

  const merged = {
    isContract: true,
    notReason: "",
    contractType: a.contractType || b.contractType || "unknown",
    confidence: avg(a.confidence, b.confidence),
    documentNote: a.documentNote || b.documentNote || "",
    wasTruncated: a.wasTruncated || b.wasTruncated,
    deepCheck: true,
    clauses: [],
    missingClauses: [],
    unverifiedCount: 0,
  };

  const bClauses = [...(b.clauses || [])];
  const usedB = new Set();

  const RISK_ORDER = { green: 0, yellow: 1, red: 2 };
  const moreCautious = (r1, r2) => (RISK_ORDER[r1] >= RISK_ORDER[r2] ? r1 : r2);

  // Match each clause in A to its closest counterpart in B
  for (const ca of (a.clauses || [])) {
    let bestIdx = -1, bestScore = 0;
    for (let i = 0; i < bClauses.length; i++) {
      if (usedB.has(i)) continue;
      const score = clauseSimilarity(ca, bClauses[i]);
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }

    if (bestIdx !== -1 && bestScore >= 0.5) {
      const cb = bClauses[bestIdx];
      usedB.add(bestIdx);
      const agree = ca.risk === cb.risk;
      const shownRisk = agree ? ca.risk : moreCautious(ca.risk, cb.risk);
      const altRisk = agree ? null : (ca.risk === shownRisk ? cb.risk : ca.risk);
      merged.clauses.push({
        ...ca,
        risk: shownRisk,
        consensus: agree ? "agree" : "disagree",
        altRisk,
        confidence: agree
          ? Math.min(1, avg(ca.confidence, cb.confidence) + 0.1)   // agreement boosts
          : Math.max(0.3, avg(ca.confidence, cb.confidence) - 0.25), // disagreement drops
      });
    } else {
      // Only run A saw this clause
      merged.clauses.push({
        ...ca,
        consensus: "partial",
        confidence: Math.max(0.3, (ca.confidence ?? 0.8) - 0.2),
      });
    }
  }

  // Clauses only run B saw
  for (let i = 0; i < bClauses.length; i++) {
    if (usedB.has(i)) continue;
    merged.clauses.push({
      ...bClauses[i],
      consensus: "partial",
      confidence: Math.max(0.3, (bClauses[i].confidence ?? 0.8) - 0.2),
    });
  }

  merged.unverifiedCount = merged.clauses.filter(c => c.verified === false).length;

  // Missing clauses: union, but mark which appeared in both
  const gapKey = g => (g.category + "|" + g.title).toLowerCase();
  const aGaps = new Map((a.missingClauses || []).map(g => [gapKey(g), g]));
  const bGaps = new Map((b.missingClauses || []).map(g => [gapKey(g), g]));
  const allKeys = new Set([...aGaps.keys(), ...bGaps.keys()]);
  for (const k of allKeys) {
    const g = aGaps.get(k) || bGaps.get(k);
    const inBoth = aGaps.has(k) && bGaps.has(k);
    merged.missingClauses.push({ ...g, consensus: inBoth ? "agree" : "partial" });
  }

  // Count disagreements for the UI
  merged.disagreementCount = merged.clauses.filter(c => c.consensus === "disagree").length;
  merged.partialCount = merged.clauses.filter(c => c.consensus === "partial").length;

  return merged;
}

function clauseSimilarity(a, b) {
  // Category exact match is a strong signal
  let score = 0;
  if (a.category && b.category && a.category.toLowerCase() === b.category.toLowerCase()) score += 0.5;
  // Title token overlap
  const ta = tokenize(a.title), tb = tokenize(b.title);
  if (ta.length && tb.length) {
    const overlap = ta.filter(t => tb.includes(t)).length;
    score += 0.5 * (overlap / Math.max(ta.length, tb.length));
  }
  // Quote overlap (if both have originalText)
  if (a.originalText && b.originalText) {
    const oa = a.originalText.toLowerCase().slice(0, 40);
    const ob = b.originalText.toLowerCase().slice(0, 40);
    if (oa && ob && (oa.includes(ob.slice(0, 20)) || ob.includes(oa.slice(0, 20)))) score = Math.max(score, 0.7);
  }
  return score;
}

function tokenize(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
}

function avg(x, y) {
  const a = typeof x === "number" ? x : 0.8;
  const b = typeof y === "number" ? y : 0.8;
  return Math.round(((a + b) / 2) * 100) / 100;
}

// ════════════════════════════════════════════════════════════════════
//  ORCHESTRATION: single-pass or deep-check (two-pass + reconcile)
//  Used by both the Vercel serverless fns and the Vite dev proxy.
// ════════════════════════════════════════════════════════════════════
export async function runAnalysis({ apiKey, messages, pdf = false, sourceText = null, deepCheck = false }) {
  const first = await callClaudeWithRetry({ apiKey, system: SYSTEM_PROMPT, messages, pdf, temperature: 0 });
  const resultA = parseAnalysis(first.text, sourceText);
  if (first.truncated) resultA.wasTruncated = true;

  if (!deepCheck || resultA.isContract === false) {
    return resultA;
  }

  // Second pass at higher temperature to expose genuine instability
  const second = await callClaudeWithRetry({ apiKey, system: SYSTEM_PROMPT, messages, pdf, temperature: 0.4 });
  const resultB = parseAnalysis(second.text, sourceText);
  if (second.truncated) resultB.wasTruncated = true;

  const reconciled = reconcileAnalyses(resultA, resultB);
  return reconciled;
}
