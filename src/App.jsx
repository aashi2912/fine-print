import { useState, useCallback } from "react";
import InputScreen from "./screens/InputScreen";
import ProcessingScreen from "./screens/ProcessingScreen";
import OverviewScreen from "./screens/OverviewScreen";
import ClauseScreen from "./screens/ClauseScreen";
import GapsScreen from "./screens/GapsScreen";
import { analyzeText, analyzeFile, analyzeImages } from "./services/analyzeContract";

const NAV = [
  { key: "input", label: "Input", icon: "\ud83d\udcdc" },
  { key: "overview", label: "Overview", icon: "\ud83d\udcca" },
  { key: "clauses", label: "Clauses", icon: "\ud83d\udcdd" },
  { key: "gaps", label: "Gaps", icon: "\u26a0\ufe0f" },
];

export default function App() {
  const [screen, setScreen] = useState("input");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isFile, setIsFile] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [deepCheck, setDeepCheck] = useState(false);

  const handleAnalyzeText = useCallback(async (text, contractType, deep) => {
    setIsFile(false); setPageCount(0); setError(null); setDeepCheck(deep); setScreen("processing");
    try { const res = await analyzeText(text, contractType, deep); setResult(res); setScreen("overview"); }
    catch (err) { setError(err.message); }
  }, []);

  const handleAnalyzeFile = useCallback(async (fileData, fileType, deep) => {
    setIsFile(true); setPageCount(1); setError(null); setDeepCheck(deep); setScreen("processing");
    try { const res = await analyzeFile(fileData, fileType, deep); setResult(res); setScreen("overview"); }
    catch (err) { setError(err.message); }
  }, []);

  const handleAnalyzeMultipleImages = useCallback(async (images, deep) => {
    setIsFile(true); setPageCount(images.length); setError(null); setDeepCheck(deep); setScreen("processing");
    try { const res = await analyzeImages(images, deep); setResult(res); setScreen("overview"); }
    catch (err) { setError(err.message); }
  }, []);

  const handleRetry = useCallback(() => { setError(null); setScreen("input"); }, []);

  return (
    <div className="max-w-lg mx-auto px-5 py-6 min-h-screen bg-paper-50">
      {screen !== "processing" && (
        <div className="flex bg-white rounded-xl p-1 mb-6 shadow-sm border border-paper-200">
          {NAV.map(item => (
            <button key={item.key}
              onClick={() => { if (item.key === "input") setScreen("input"); else if (result) setScreen(item.key); }}
              className={`flex-1 py-2.5 px-2 rounded-lg text-[11px] font-semibold font-body transition-all ${
                screen === item.key
                  ? "bg-ink text-white shadow-sm"
                  : result || item.key === "input"
                  ? "text-ink-muted hover:text-ink"
                  : "text-paper-300 cursor-not-allowed"
              }`}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="animate-fade-in" key={screen}>
        {screen === "input" && (
          <InputScreen
            onAnalyze={handleAnalyzeText}
            onAnalyzeFile={handleAnalyzeFile}
            onAnalyzeMultipleImages={handleAnalyzeMultipleImages}
          />
        )}
        {screen === "processing" && (
          <ProcessingScreen onRetry={handleRetry} error={error} isFile={isFile} pageCount={pageCount} deepCheck={deepCheck} />
        )}
        {screen === "overview" && result && (
          <OverviewScreen result={result} onViewClauses={() => setScreen("clauses")} onViewGaps={() => setScreen("gaps")} />
        )}
        {screen === "clauses" && result && <ClauseScreen result={result} onBack={() => setScreen("overview")} />}
        {screen === "gaps" && result && <GapsScreen result={result} onBack={() => setScreen("overview")} />}
      </div>
    </div>
  );
}
