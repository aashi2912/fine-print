import { calcScore, calcVerdict, calcAnalysisConfidence } from "../utils/scoring.js";

async function safeFetch(url, options) {
  let resp;
  try { resp = await fetch(url, options); }
  catch { throw new Error("Couldn't reach the analysis service. Check your connection and try again."); }

  const ct = resp.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const raw = await resp.text();
    if (raw.includes("FUNCTION_PAYLOAD_TOO_LARGE")) throw new Error("The upload is too large. Try fewer pages, or paste the text directly.");
    if (raw.includes("FUNCTION_INVOCATION_TIMEOUT")) throw new Error("Analysis took too long. Try a shorter document or paste the text directly.");
    throw new Error("Unexpected response from server: " + raw.slice(0, 140));
  }
  const data = await resp.json();
  if (!resp.ok || data.error) throw new Error(data.error || ("Request failed (HTTP " + resp.status + ")"));
  return data;
}

export async function analyzeText(text, contractType, deepCheck = false) {
  return postProcess(await safeFetch("/api/analyze", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, contractType, deepCheck }),
  }));
}

export async function analyzeFile(fileData, fileType, deepCheck = false) {
  return postProcess(await safeFetch("/api/analyze-file", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileData, fileType, deepCheck }),
  }));
}

export async function analyzeImages(images, deepCheck = false) {
  return postProcess(await safeFetch("/api/analyze-images", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images, deepCheck }),
  }));
}

function postProcess(data) {
  if (data.isContract === false) {
    const err = new Error(data.notReason || "This doesn't look like a contract. Please upload a lease, NDA, employment, freelance, or terms-of-service document.");
    err.code = "NOT_A_CONTRACT";
    throw err;
  }

  const clauses = [...(data.clauses || [])].sort((a, b) => {
    const o = { red: 0, yellow: 1, green: 2 };
    if ((o[a.risk] ?? 2) !== (o[b.risk] ?? 2)) return (o[a.risk] ?? 2) - (o[b.risk] ?? 2);
    // surface disagreements + unverified first within same risk
    const aFlag = (a.consensus === "disagree" || a.verified === false) ? 0 : 1;
    const bFlag = (b.consensus === "disagree" || b.verified === false) ? 0 : 1;
    return aFlag - bFlag;
  });
  const gaps = data.missingClauses || [];

  return {
    contractType: data.contractType || "unknown",
    confidence: calcAnalysisConfidence(data),
    healthScore: calcScore(clauses, gaps),
    verdict: calcVerdict(clauses, gaps),
    clauses,
    missingClauses: gaps,
    wasTruncated: data.wasTruncated === true,
    unverifiedCount: data.unverifiedCount || 0,
    documentNote: data.documentNote || "",
    pageCount: data.pageCount || 0,
    // deep-check signals
    deepCheck: data.deepCheck === true,
    disagreementCount: data.disagreementCount || 0,
    partialCount: data.partialCount || 0,
  };
}
