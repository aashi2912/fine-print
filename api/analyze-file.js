import { buildAnalyzePrompt, runAnalysis } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Server not configured. API key missing." });

  const { fileData, fileType, deepCheck } = req.body || {};
  if (!fileData) return res.status(400).json({ error: "No file received." });

  try {
    const isPDF = fileType === "application/pdf";
    const fileBlock = isPDF
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileData } }
      : { type: "image", source: { type: "base64", media_type: fileType || "image/jpeg", data: fileData } };

    const result = await runAnalysis({
      apiKey, pdf: isPDF,
      messages: [{ role: "user", content: [fileBlock, { type: "text", text: buildAnalyzePrompt("auto") }] }],
      sourceText: null,
      deepCheck: deepCheck === true,
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error("[analyze-file]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
