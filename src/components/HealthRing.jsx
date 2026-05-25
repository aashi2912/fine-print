export default function HealthRing({ score }) {
  const r = 54, circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 70 ? "#16a34a" : score >= 40 ? "#ca8a04" : "#dc2626";
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#ebe5db" strokeWidth="7" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-out" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold font-body" style={{ color }}>{score}</span>
        <span className="text-[10px] text-ink-muted font-semibold uppercase tracking-widest font-body">Health</span>
      </div>
    </div>
  );
}
