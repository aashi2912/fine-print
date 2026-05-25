import GapCard from "../components/GapCard";
import Disclaimer from "../components/Disclaimer";

export default function GapsScreen({ result, onBack }) {
  const gaps = result.missingClauses;
  const critCount = gaps.filter(g => g.severity === "critical").length;
  const recCount = gaps.length - critCount;
  const typeLabel = {
    lease: "residential lease", nda: "NDA", employment: "employment contract",
    freelance: "freelance agreement", tos: "terms of service",
  }[result.contractType] || "contract";

  return (
    <div>
      <button onClick={onBack} className="text-ink-muted hover:text-ink text-sm font-body mb-3 transition-colors">{"\u2190"} Back to overview</button>
      <h2 className="text-xl font-extrabold text-ink mb-1 font-display">Missing Clauses</h2>
      <p className="text-xs text-ink-muted font-body mb-1">
        Clauses that should typically appear in a {typeLabel} but aren't in this document.
      </p>
      {gaps.length > 0 && (
        <p className="text-xs text-danger font-semibold font-body mb-5">{critCount} critical, {recCount} recommended</p>
      )}

      {gaps.length === 0 && (
        <div className="text-center py-12 bg-green-50 border border-green-200 rounded-xl">
          <span className="text-3xl">{"\u2705"}</span>
          <p className="text-sm text-safe font-semibold font-body mt-3">No missing clauses detected.</p>
          <p className="text-xs text-ink-muted font-body mt-1">This contract covers the expected topics for a {typeLabel}.</p>
        </div>
      )}

      {gaps.map((gap, i) => <GapCard key={i} gap={gap} />)}

      {gaps.length > 0 && (
        <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2 font-body">What you can do</p>
          <p className="text-xs text-blue-600 leading-relaxed font-body">
            Ask the other party about these missing clauses before signing. You can request that specific terms be added. For high-stakes contracts, consult a licensed attorney.
          </p>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
