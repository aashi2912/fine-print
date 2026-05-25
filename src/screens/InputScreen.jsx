import { useState, useRef } from "react";
import { SAMPLES } from "../data/sampleContracts";
import { CONTRACT_TYPES } from "../data/templates";
import Disclaimer from "../components/Disclaimer";

// ── Compress image to max 1400px wide, JPEG 75% ──
// Reduces a 4MB phone photo to ~150-250KB — well under Vercel's 4.5MB limit
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 1400;
      let { width, height } = img;
      if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      // Export as JPEG base64 (no data: prefix)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, dataUrl, fileType: "image/jpeg" });
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Could not load image")); };
    img.src = objectUrl;
  });
}

// ── Plain file → base64 (for PDFs) ──
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

export default function InputScreen({ onAnalyze, onAnalyzeFile, onAnalyzeMultipleImages }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("auto");
  const [msg, setMsg] = useState(null);     // { ok: bool, text: string }
  const [pages, setPages] = useState([]);   // [{ base64, dataUrl, fileType, label }]
  const [mode, setMode] = useState("idle"); // idle | photos | text
  const [compressing, setCompressing] = useState(false);
  const [deep, setDeep] = useState(false);
  const cameraRef = useRef(null);
  const fileRef = useRef(null);

  // ── Add one photo page (compress first) ──
  async function handlePhotoCapture(file) {
    if (!file || !file.type.startsWith("image/")) return;
    setCompressing(true);
    setMsg({ ok: true, text: "Compressing image..." });
    try {
      const { base64, dataUrl, fileType } = await compressImage(file);
      const sizeKB = Math.round(base64.length * 0.75 / 1024);
      setPages(prev => {
        const next = [...prev, { base64, dataUrl, fileType, label: "Page " + (prev.length + 1) }];
        setMsg({ ok: true, text: next.length === 1
          ? "Page 1 added (" + sizeKB + "KB). Add more pages or tap Analyze."
          : "Page " + next.length + " added (" + sizeKB + "KB). Keep adding or tap Analyze." });
        return next;
      });
      setMode("photos");
    } catch (err) {
      setMsg({ ok: false, text: "Could not read image: " + err.message });
    }
    setCompressing(false);
  }

  // ── PDF or text file ──
  async function handleFileUpload(file) {
    if (!file) return;
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = e => { setText(e.target?.result || ""); setMode("text"); setMsg({ ok: true, text: "Loaded. Tap Analyze to continue." }); };
      reader.readAsText(file);
      return;
    }
    if (file.type === "application/pdf") {
      if (file.size > 15 * 1024 * 1024) { setMsg({ ok: false, text: "PDF too large (max 15MB)." }); return; }
      try {
        const base64 = await toBase64(file);
        setMsg({ ok: true, text: "PDF ready — starting analysis..." });
        onAnalyzeFile(base64, file.type, deep);
      } catch { setMsg({ ok: false, text: "Could not read PDF." }); }
      return;
    }
    if (file.type.startsWith("image/")) { handlePhotoCapture(file); return; }
    setMsg({ ok: false, text: "Upload a PDF, photo, or text file." });
  }

  function removePage(i) {
    setPages(prev => {
      const next = prev.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, label: "Page " + (idx + 1) }));
      if (next.length === 0) { setMode("idle"); setMsg(null); }
      else setMsg({ ok: true, text: next.length + " page" + (next.length !== 1 ? "s" : "") + " captured." });
      return next;
    });
  }

  function clearAll() { setPages([]); setText(""); setMode("idle"); setMsg(null); }

  function triggerCamera() {
    cameraRef.current.accept = "image/*";
    cameraRef.current.capture = "environment";
    cameraRef.current.click();
  }

  function triggerFilePicker() {
    fileRef.current.accept = ".pdf,image/*,.txt";
    fileRef.current.removeAttribute("capture");
    fileRef.current.click();
  }

  // Estimate payload size for user feedback
  const estimatedKB = pages.reduce((sum, p) => sum + Math.round(p.base64.length * 0.75 / 1024), 0);
  const payloadOK = estimatedKB < 3500; // warn above 3.5MB (Vercel limit ~4.5MB)

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <span className="text-3xl">{"\ud83d\udcdc"}</span>
          <h1 className="text-3xl font-extrabold text-ink font-display">Fine Print</h1>
        </div>
        <p className="text-base text-ink-muted font-body">
          Decode any contract. See what it really says {"\u2014"} and what's missing.
        </p>
      </div>

      {/* ═══ PHOTO MODE ═══ */}
      {mode === "photos" && (
        <div className="mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
            <p className="text-xs font-semibold text-blue-800 font-body mb-0.5">📋 Multi-page capture</p>
            <p className="text-xs text-blue-700 font-body leading-relaxed">
              Photograph each page of your contract one at a time. Tap <strong>Analyze</strong> when all pages are captured.
            </p>
          </div>

          {/* Page thumbnails */}
          <div className="flex flex-wrap gap-2.5 mb-3">
            {pages.map((p, i) => (
              <div key={i} className="relative group flex-shrink-0">
                <img src={p.dataUrl} alt={p.label}
                  className="w-[88px] h-[110px] object-cover rounded-xl border-2 border-paper-200 shadow-sm" />
                <div className="absolute bottom-0 left-0 right-0 bg-ink/65 rounded-b-xl py-1 text-center">
                  <span className="text-white text-[9px] font-bold font-body">{p.label}</span>
                </div>
                <button onClick={() => removePage(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-danger text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
                  ✕
                </button>
              </div>
            ))}

            {/* Add page tile */}
            <button onClick={triggerCamera} disabled={compressing}
              className="w-[88px] h-[110px] rounded-xl border-2 border-dashed border-accent/40 bg-blue-50 flex flex-col items-center justify-center gap-1.5 hover:border-accent transition-colors flex-shrink-0 disabled:opacity-40">
              <span className="text-2xl">{compressing ? "⏳" : "📷"}</span>
              <span className="text-[10px] font-semibold text-accent font-body text-center leading-tight">
                {compressing ? "Wait..." : "Add\nPage"}
              </span>
            </button>
          </div>

          {/* Payload size warning */}
          {!payloadOK && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-2">
              <p className="text-xs text-orange-700 font-body">
                ⚠️ Large upload ({Math.round(estimatedKB / 1024 * 10) / 10}MB). Consider using fewer pages or pasting text instead.
              </p>
            </div>
          )}

          {/* Deep-check toggle */}
          <DeepToggle deep={deep} setDeep={setDeep} />

          {/* Analyze button */}
          <button
            onClick={() => payloadOK && onAnalyzeMultipleImages(pages.map(p => ({ base64: p.base64, fileType: p.fileType })), deep)}
            disabled={!payloadOK || compressing}
            className={`w-full py-4 rounded-xl text-base font-bold font-body transition-all mb-2 ${
              payloadOK && !compressing
                ? "bg-ink text-white active:scale-[0.98] shadow-lg shadow-ink/10"
                : "bg-paper-200 text-paper-400 cursor-not-allowed"
            }`}>
            Analyze {pages.length} Page{pages.length !== 1 ? "s" : ""} {deep ? "(Deep) " : ""}→
          </button>

          <button onClick={clearAll}
            className="w-full py-2.5 rounded-xl border border-paper-300 text-ink-muted text-xs font-body hover:text-ink transition-colors">
            ✕ Clear & start over
          </button>
        </div>
      )}

      {/* ═══ IDLE / TEXT MODE ═══ */}
      {mode !== "photos" && (
        <>
          <div className="flex gap-2 mb-3">
            <button onClick={triggerCamera}
              className="flex-1 py-3.5 rounded-xl border-2 border-dashed border-paper-300 bg-white text-sm font-semibold text-ink-light font-body hover:border-accent hover:text-accent transition-colors flex flex-col items-center justify-center gap-1">
              <span className="text-2xl">📷</span>
              <span>Take Photo</span>
              <span className="text-[10px] text-paper-400 font-normal">Multi-page supported</span>
            </button>
            <button onClick={triggerFilePicker}
              className="flex-1 py-3.5 rounded-xl border-2 border-dashed border-paper-300 bg-white text-sm font-semibold text-ink-light font-body hover:border-accent hover:text-accent transition-colors flex flex-col items-center justify-center gap-1">
              <span className="text-2xl">📄</span>
              <span>Upload PDF</span>
              <span className="text-[10px] text-paper-400 font-normal">or image file</span>
            </button>
          </div>

          {msg && (
            <div className={`rounded-lg px-4 py-2.5 mb-3 text-xs font-body leading-relaxed ${
              msg.ok ? "bg-blue-50 border border-blue-200 text-blue-700" : "bg-red-50 border border-red-200 text-red-700"
            }`}>{msg.text}</div>
          )}

          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-paper-200" />
            <span className="text-xs text-ink-muted font-body">or paste text</span>
            <div className="flex-1 h-px bg-paper-200" />
          </div>

          <textarea value={text}
            onChange={e => { setText(e.target.value); setMode(e.target.value.length > 0 ? "text" : "idle"); }}
            placeholder="Paste your contract, lease, NDA, or terms of service here..."
            className="w-full min-h-[160px] p-4 rounded-xl bg-white border border-paper-300 text-ink text-sm font-body resize-y outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-paper-400" />

          <div className="flex items-center justify-between mt-2 mb-4">
            <span className="text-[11px] text-ink-muted font-body">{text.length.toLocaleString()} characters</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-muted font-body">Type:</span>
              <select value={type} onChange={e => setType(e.target.value)}
                className="text-[11px] bg-white border border-paper-300 text-ink rounded-lg px-2.5 py-1.5 outline-none font-body">
                {CONTRACT_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
              </select>
            </div>
          </div>

          {text.length >= 100 && <DeepToggle deep={deep} setDeep={setDeep} />}

          <button onClick={() => text.length >= 100 && onAnalyze(text, type, deep)} disabled={text.length < 100}
            className={`w-full py-4 rounded-xl text-base font-bold font-body transition-all ${
              text.length >= 100
                ? "bg-ink text-white active:scale-[0.98] shadow-lg shadow-ink/10"
                : "bg-paper-200 text-paper-400 cursor-not-allowed"
            }`}>
            {text.length < 100 ? "Paste or upload at least 100 characters" : ("Analyze My Contract " + (deep ? "(Deep) " : "") + "\u2192")}
          </button>

          <div className="mt-5">
            <p className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold mb-2 font-body">Try a sample:</p>
            <div className="flex gap-3">
              {SAMPLES.map(s => (
                <button key={s.label} onClick={() => { setText(s.text); setMode("text"); setMsg(null); }}
                  className="text-xs text-accent hover:text-accent/80 font-semibold font-body transition-colors">
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Status msg in photo mode */}
      {mode === "photos" && msg && (
        <div className={`rounded-lg px-4 py-2.5 mt-2 text-xs font-body leading-relaxed ${
          msg.ok ? "bg-blue-50 border border-blue-200 text-blue-700" : "bg-red-50 border border-red-200 text-red-700"
        }`}>{msg.text}</div>
      )}

      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoCapture(f); e.target.value = ""; }} />
      <input ref={fileRef} type="file" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />

      <Disclaimer />
    </div>
  );
}

function DeepToggle({ deep, setDeep }) {
  return (
    <button
      onClick={() => setDeep(d => !d)}
      className={`w-full mb-2 rounded-xl border px-4 py-3 flex items-center gap-3 transition-all text-left ${
        deep ? "bg-blue-50 border-accent/40" : "bg-white border-paper-200 hover:border-paper-300"
      }`}>
      <div className={`w-9 h-5 rounded-full flex-shrink-0 relative transition-colors ${deep ? "bg-accent" : "bg-paper-300"}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${deep ? "left-[18px]" : "left-0.5"}`} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold text-ink font-body">Deep check {deep ? "ON" : "OFF"}</p>
        <p className="text-[11px] text-ink-muted font-body leading-snug">
          Runs the analysis twice and flags any clauses the two runs disagree on. Slower, but higher confidence — best for high-stakes contracts.
        </p>
      </div>
    </button>
  );
}
