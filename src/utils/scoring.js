// ════════════════════════════════════════════════════════════
//  Health score — deterministic, client-side, transparent.
//  Never trust the LLM's arithmetic. Same inputs => same score.
// ════════════════════════════════════════════════════════════

export function calcScore(clauses, gaps) {
  const reds    = (clauses || []).filter(c => c.risk === "red").length;
  const yellows = (clauses || []).filter(c => c.risk === "yellow").length;
  const crit    = (gaps || []).filter(g => g.severity === "critical").length;
  const rec     = (gaps || []).filter(g => g.severity === "recommended").length;

  // Capped deductions so the scale stays meaningful across contract quality.
  const score = 100
    - Math.min(reds * 8, 48)
    - Math.min(yellows * 3, 18)
    - Math.min(crit * 7, 28)
    - Math.min(rec * 2, 10);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calcVerdict(clauses, gaps) {
  const s = calcScore(clauses, gaps);
  if (s >= 85) return "This contract looks healthy and balanced. Review the clauses below to confirm.";
  if (s >= 70) return "Generally fair, with a few minor points worth noting.";
  if (s >= 55) return "Has some unusual clauses that deviate from standard practice.";
  if (s >= 35) return "Significant concerns here. Read the flagged clauses carefully before signing.";
  if (s >= 15) return "Serious issues. Consider negotiating these terms or seeking legal advice.";
  return "Heavily one-sided. We'd strongly suggest legal review before signing.";
}

// Overall confidence in the analysis (averaged from per-clause confidence),
// surfaced to the user so they know how much to lean on the result.
export function calcAnalysisConfidence(result) {
  const cs = result.clauses || [];
  if (cs.length === 0) return result.confidence ?? 0.7;
  const avg = cs.reduce((sum, c) => sum + (c.confidence ?? 0.8), 0) / cs.length;
  // Blend clause-level avg with model's document-level confidence
  const docConf = result.confidence ?? 0.8;
  return Math.round(((avg * 0.7) + (docConf * 0.3)) * 100) / 100;
}

export function confidenceLabel(conf) {
  if (conf >= 0.85) return { label: "High confidence", tone: "safe" };
  if (conf >= 0.65) return { label: "Moderate confidence", tone: "caution" };
  return { label: "Low confidence — verify carefully", tone: "danger" };
}
