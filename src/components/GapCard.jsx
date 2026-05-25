import { useState } from "react";

export default function GapCard({ gap }) {
  const [open, setOpen] = useState(true);
  const isCritical = gap.severity === "critical";
  const color = isCritical ? "#dc2626" : "#ca8a04";
  const bg = isCritical ? "#fef2f2" : "#fefce8";
  const border = isCritical ? "#fecaca" : "#fde68a";
  const textColor = isCritical ? "#7f1d1d" : "#713f12";

  return (
    <div className="bg-white rounded-xl mb-2.5 overflow-hidden shadow-sm" style={{ border: "1px solid " + border }}>
      <div onClick={() => setOpen(!open)} className="p-4 cursor-pointer flex items-center gap-2.5">
        <span className="text-base">{"\u26a0\ufe0f"}</span>
        <span className="text-sm font-semibold text-ink flex-1 font-body">Missing: {gap.title}</span>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase font-body"
          style={{ color, backgroundColor: bg, border: "1px solid " + border }}>{gap.severity}</span>
        <span className="text-ink-muted text-xs ml-1" style={{ transform: open ? "rotate(180deg)" : "", transition: "0.2s" }}>{"\u25BE"}</span>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-paper-200">
          {gap.standardLanguage && (
            <div className="bg-paper-100 rounded-lg p-3.5 mt-3 mb-3">
              <p className="text-[10px] font-bold text-ink-muted mb-1.5 uppercase tracking-wider font-body">What This Normally Says</p>
              <p className="text-[12px] text-ink-light leading-relaxed font-body">{gap.standardLanguage}</p>
            </div>
          )}
          {gap.whyItMatters && (
            <div className="rounded-lg p-3.5" style={{ backgroundColor: bg, border: "1px solid " + border }}>
              <p className="text-[10px] font-bold mb-1.5 uppercase tracking-wider font-body" style={{ color }}>Why This Matters</p>
              <p className="text-[12px] leading-relaxed font-body" style={{ color: textColor }}>{gap.whyItMatters}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
