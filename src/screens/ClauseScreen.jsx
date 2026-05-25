import ClauseCard from "../components/ClauseCard";
import Disclaimer from "../components/Disclaimer";

export default function ClauseScreen({ result, onBack }) {
  return (
    <div>
      <button onClick={onBack} className="text-ink-muted hover:text-ink text-sm font-body mb-3 transition-colors">{"\u2190"} Back to overview</button>
      <h2 className="text-xl font-extrabold text-ink mb-1 font-display">Clause Analysis</h2>
      <p className="text-xs text-ink-muted font-body mb-5">
        {result.clauses.length} clauses extracted. Risky clauses shown first.
      </p>
      {result.clauses.map((clause, i) => (
        <ClauseCard key={clause.id || i} clause={clause} defaultOpen={clause.risk !== "green" && i < 4} />
      ))}
      <Disclaimer />
    </div>
  );
}
