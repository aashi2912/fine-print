import HealthRing from "../components/HealthRing";
import Disclaimer from "../components/Disclaimer";
import { confidenceLabel } from "../utils/scoring";

export default function OverviewScreen({ result, onViewClauses, onViewGaps }) {
  const conf = confidenceLabel(result.confidence);
  const confColors = {
    safe: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
    caution: { bg: "#fefce8", border: "#fde68a", text: "#a16207" },
    danger: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
  }[conf.tone];
  const reds = result.clauses.filter(c => c.risk === "red").length;
  const yellows = result.clauses.filter(c => c.risk === "yellow").length;
  const greens = result.clauses.filter(c => c.risk === "green").length;
  const total = result.clauses.length;
  const critGaps = result.missingClauses.filter(g => g.severity === "critical").length;

  const typeLabel = {
    lease: "Residential Lease", nda: "NDA / Confidentiality",
    employment: "Employment Contract", freelance: "Freelance Agreement",
    tos: "Terms of Service", unknown: "Contract",
  }[result.contractType] || result.contractType;

  function copyToClipboard() {
    const text = [
      "Fine Print Analysis",
      "Type: " + typeLabel,
      "Score: " + result.healthScore + "/100",
      result.verdict,
      "",
      greens + " standard, " + yellows + " unusual, " + reds + " risky",
      result.missingClauses.length + " missing clauses",
      "",
      "Issues:",
      ...result.clauses.filter(c => c.risk === "red").map(c => "- " + c.title + ": " + c.explanation),
      "",
      "Missing:",
      ...result.missingClauses.map(g => "- " + g.title + " (" + g.severity + "): " + g.whyItMatters),
      "",
      "Fine Print — legal information, not legal advice.",
    ].join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div>
      {/* ── Reliability warnings (truncation / unverified / doc issues) ── */}
      {result.deepCheck && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-3 flex items-start gap-2.5">
          <span className="text-base flex-shrink-0">{"\ud83d\udd2c"}</span>
          <p className="text-xs text-blue-800 font-body leading-relaxed">
            <strong>Deep check ran.</strong> The contract was analyzed twice.{" "}
            {result.disagreementCount > 0
              ? result.disagreementCount + " clause" + (result.disagreementCount !== 1 ? "s" : "") + " where the two runs disagreed are flagged below — treat those as uncertain."
              : "Both runs agreed on every clause, which is a strong signal."}
          </p>
        </div>
      )}
      {result.wasTruncated && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 mb-3 flex items-start gap-2.5">
          <span className="text-base flex-shrink-0">{"\u2702\ufe0f"}</span>
          <p className="text-xs text-orange-800 font-body leading-relaxed">
            <strong>This contract was long</strong> — the analysis may not cover every clause. For complete coverage, analyze it in smaller sections.
          </p>
        </div>
      )}
      {result.unverifiedCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 mb-3 flex items-start gap-2.5">
          <span className="text-base flex-shrink-0">{"\ud83d\udd0d"}</span>
          <p className="text-xs text-orange-800 font-body leading-relaxed">
            <strong>{result.unverifiedCount} quote{result.unverifiedCount !== 1 ? "s" : ""} couldn't be verified</strong> against your document text. Those clauses are marked below — double-check them against the original.
          </p>
        </div>
      )}
      {result.documentNote && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-3 flex items-start gap-2.5">
          <span className="text-base flex-shrink-0">{"\u2139\ufe0f"}</span>
          <p className="text-xs text-blue-800 font-body leading-relaxed">{result.documentNote}</p>
        </div>
      )}

      {reds > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-5 flex items-center gap-2.5">
          <span className="text-base">{"\ud83d\udea8"}</span>
          <p className="text-xs text-red-700 font-semibold font-body">
            This contract contains {reds} clause{reds !== 1 ? "s" : ""} that may be unusually one-sided or risky.
          </p>
        </div>
      )}

      <HealthRing score={result.healthScore} />

      <p className="text-center text-sm text-ink mt-3 mb-1 font-semibold font-body">{result.verdict}</p>
      <div className="flex justify-center gap-2 mb-2 flex-wrap">
        <span className="text-[10px] text-ink-muted bg-paper-100 px-2.5 py-1 rounded-md border border-paper-200 font-body">
          Detected: {typeLabel}
        </span>
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-md font-body"
          style={{ backgroundColor: confColors.bg, borderWidth: 1, borderColor: confColors.border, color: confColors.text }}>
          {conf.label} ({Math.round(result.confidence * 100)}%)
        </span>
      </div>
      <p className="text-center text-[10px] text-ink-muted mb-6 font-body px-6 leading-relaxed">
        Fine Print is a first-pass guide, not a lawyer. For high-stakes contracts, confirm with a legal professional.
      </p>

      <div className="bg-white rounded-xl p-4 border border-paper-200 shadow-sm mb-4">
        <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wider mb-2 font-body">{total} clauses analyzed</p>
        <div className="flex h-3.5 rounded-full overflow-hidden bg-paper-100">
          {greens > 0 && <div className="bg-safe transition-all duration-700" style={{ width: (greens / total * 100) + "%" }} />}
          {yellows > 0 && <div className="bg-caution transition-all duration-700" style={{ width: (yellows / total * 100) + "%" }} />}
          {reds > 0 && <div className="bg-danger transition-all duration-700" style={{ width: (reds / total * 100) + "%" }} />}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-safe font-semibold font-body">{greens} standard</span>
          <span className="text-[11px] text-caution font-semibold font-body">{yellows} unusual</span>
          <span className="text-[11px] text-danger font-semibold font-body">{reds} risky</span>
        </div>
      </div>

      {result.missingClauses.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span>{"\u26a0\ufe0f"}</span>
            <span className="text-sm font-bold text-red-700 font-body">
              {result.missingClauses.length} expected clause{result.missingClauses.length !== 1 ? "s" : ""} not found
            </span>
          </div>
          <p className="text-[11px] text-red-500 ml-6 font-body">
            {critGaps > 0 ? critGaps + " critical, " + (result.missingClauses.length - critGaps) + " recommended" : "All recommended"}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onViewClauses} className="py-3.5 rounded-xl bg-ink text-white text-sm font-bold font-body active:scale-[0.98] transition-transform shadow-sm">
          View Clauses ({total})
        </button>
        <button onClick={onViewGaps} className="py-3.5 rounded-xl border-2 border-danger text-danger text-sm font-bold font-body hover:bg-red-50 transition-colors">
          View Missing ({result.missingClauses.length})
        </button>
      </div>

      <button onClick={copyToClipboard} className="w-full mt-3 py-2.5 rounded-xl border border-paper-300 text-ink-muted text-xs font-body hover:text-ink hover:border-paper-400 transition-colors">
        {"\ud83d\udccb"} Copy Summary
      </button>

      <Disclaimer />
    </div>
  );
}
