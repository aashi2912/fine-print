const RISK = {
  red:    { label: "RISKY",    color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  yellow: { label: "UNUSUAL",  color: "#ca8a04", bg: "#fefce8", border: "#fde68a" },
  green:  { label: "STANDARD", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
};
export default function RiskBadge({ risk }) {
  const r = RISK[risk] || RISK.green;
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md font-body"
      style={{ color: r.color, backgroundColor: r.bg, border: "1px solid " + r.border }}>
      {r.label}
    </span>
  );
}
export const RISK_COLORS = { red: "#dc2626", yellow: "#ca8a04", green: "#16a34a" };
export const RISK_BG = { red: "#fef2f2", yellow: "#fefce8", green: "#f0fdf4" };
export const RISK_BORDER = { red: "#fecaca", yellow: "#fde68a", green: "#bbf7d0" };
