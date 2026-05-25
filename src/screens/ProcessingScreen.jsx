import { useEffect, useState } from "react";

export default function ProcessingScreen({ onRetry, error, isFile, pageCount, deepCheck }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (error) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [error]);

  const isMultiPage = pageCount > 1;

  const getMessage = () => {
    if (elapsed < 5) return isMultiPage ? "Reading " + pageCount + " pages..." : isFile ? "Reading your document..." : "Reading contract...";
    if (elapsed < 12) return "Identifying clauses...";
    if (elapsed < 20) return "Scoring risks...";
    if (elapsed < 28) return "Checking for missing clauses...";
    return "Almost done...";
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-4xl mb-4">{"\ud83d\udea8"}</span>
        <p className="text-danger font-bold font-body mb-2">Analysis Failed</p>
        <p className="text-sm text-ink-muted font-body max-w-xs leading-relaxed mb-6">{error}</p>
        <button onClick={onRetry}
          className="px-6 py-2.5 rounded-xl bg-ink text-white text-sm font-bold font-body hover:bg-ink/90 transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  const baseTime = isMultiPage
    ? Math.round(15 + pageCount * 5) + "–" + Math.round(25 + pageCount * 5)
    : isFile ? "15–25" : "10–20";
  const estimatedTime = deepCheck
    ? (isMultiPage ? Math.round(30 + pageCount * 10) + "–" + Math.round(50 + pageCount * 10) : isFile ? "30–50" : "20–40")
    : baseTime;

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-16 h-16 mb-8">
        <div className="w-16 h-16 rounded-full border-4 border-paper-200 border-t-ink animate-spin" />
      </div>

      <p className="text-base font-semibold text-ink font-body mb-1">{getMessage()}</p>
      <p className="text-xs text-ink-muted font-body text-center max-w-xs">
        {isMultiPage
          ? "Analyzing " + pageCount + " pages as one document"
          : isFile ? "AI is reading and analyzing your document" : "AI is analyzing your contract"}
      </p>

      {isMultiPage && (
        <div className="flex gap-1.5 mt-4 flex-wrap justify-center max-w-xs">
          {Array.from({ length: pageCount }).map((_, i) => (
            <div key={i}
              className="text-[10px] px-2 py-0.5 rounded font-body font-semibold transition-colors"
              style={{
                background: elapsed > i * 3 ? "#1a1a1a" : "#ece5d8",
                color: elapsed > i * 3 ? "#fff" : "#8a8580",
              }}>
              p{i + 1}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2">
        {[0, 8, 16, 24].map((threshold, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full transition-colors"
            style={{ background: elapsed >= threshold ? "#1a1a1a" : "#d6cdc0" }} />
        ))}
      </div>
      <p className="text-[10px] text-paper-400 mt-2 font-body">
        Usually takes {estimatedTime} seconds{deepCheck ? " · Deep check (2 passes)" : ""}
      </p>
    </div>
  );
}
