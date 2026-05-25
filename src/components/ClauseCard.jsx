import { useState } from "react";
import RiskBadge, { RISK_COLORS, RISK_BG, RISK_BORDER } from "./RiskBadge";

export default function ClauseCard({ clause, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const color = RISK_COLORS[clause.risk] || RISK_COLORS.green;
  const bg = RISK_BG[clause.risk] || RISK_BG.green;
  const border = RISK_BORDER[clause.risk] || RISK_BORDER.green;
  const textColor = clause.risk === "red" ? "#7f1d1d" : clause.risk === "yellow" ? "#713f12" : "#14532d";

  const unverified = clause.verified === false && clause.originalText;
  const lowConf = typeof clause.confidence === "number" && clause.confidence < 0.65;
  const disagreed = clause.consensus === "disagree";

  return (
    <div className="bg-white rounded-xl mb-2.5 overflow-hidden shadow-sm"
      style={{ border: "1px solid #ebe5db", borderLeftColor: color, borderLeftWidth: 3 }}>
      <div onClick={() => setOpen(!open)} className="p-4 cursor-pointer flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-ink flex-1 font-body">{clause.title}</span>
        {disagreed && (
          <span title="The two analysis runs disagreed on this clause's risk"
            className="text-[9px] font-bold px-1.5 py-0.5 rounded font-body"
            style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
            UNCERTAIN
          </span>
        )}
        {unverified && (
          <span title="This quote could not be matched to your document text"
            className="text-[9px] font-bold px-1.5 py-0.5 rounded font-body"
            style={{ backgroundColor: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}>
            UNVERIFIED
          </span>
        )}
        <RiskBadge risk={clause.risk} />
        <span className="text-ink-muted text-xs ml-1" style={{ transform: open ? "rotate(180deg)" : "", transition: "0.2s" }}>{"\u25BE"}</span>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-paper-200">
          {disagreed && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 mt-3 mb-1">
              <p className="text-[11px] text-blue-800 font-body leading-relaxed">
                {"\ud83d\udd2c"} On a second analysis run, this clause was scored differently{clause.altRisk ? " (the other run called it \u201c" + clause.altRisk + "\u201d)" : ""}. We've shown the more cautious rating. Read it carefully and verify against your document.
              </p>
            </div>
          )}
          {unverified && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 mt-3 mb-1">
              <p className="text-[11px] text-orange-800 font-body leading-relaxed">
                {"\u26a0\ufe0f"} We couldn't match this quote to your document text exactly. It may be paraphrased — verify against your original before relying on it.
              </p>
            </div>
          )}
          {clause.originalText && (
            <div className="bg-paper-100 rounded-lg p-3.5 mt-3 mb-3">
              <p className="text-[10px] font-bold text-ink-muted mb-1.5 uppercase tracking-wider font-body">From Your Contract</p>
              <p className="text-[12px] text-ink-light italic leading-relaxed font-body">&ldquo;{clause.originalText}&rdquo;</p>
            </div>
          )}
          {clause.explanation && (
            <div className="rounded-lg p-3.5 mb-2" style={{ backgroundColor: bg, border: "1px solid " + border }}>
              <p className="text-[10px] font-bold mb-1.5 uppercase tracking-wider font-body" style={{ color }}>What This Means</p>
              <p className="text-[12px] leading-relaxed font-body" style={{ color: textColor }}>{clause.explanation}</p>
            </div>
          )}
          {clause.comparisonNote && (
            <p className="text-[11px] text-ink-muted italic font-body mt-1">{clause.comparisonNote}</p>
          )}
          {lowConf && (
            <p className="text-[10px] text-orange-700 font-body mt-2">
              {"\u2139\ufe0f"} Lower confidence on this one — it may be ambiguous or depend on your local laws.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
