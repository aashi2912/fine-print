import { buildAnalyzePrompt, runAnalysis } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Server not configured. API key missing." });

  const { images, deepCheck } = req.body || {};
  if (!images || !Array.isArray(images) || images.length === 0)
    return res.status(400).json({ error: "No images received." });
  if (images.length > 25)
    return res.status(400).json({ error: "Too many pages (max 25). Split into smaller batches." });

  try {
    const content = [
      ...images.map(img => ({ type: "image", source: { type: "base64", media_type: img.fileType || "image/jpeg", data: img.base64 } })),
      { type: "text", text: (images.length > 1
        ? "The above " + images.length + " images are sequential pages (1 to " + images.length + ") of ONE contract. Treat them as a single complete document. If any page looks unreadable or appears missing, note it in documentNote.\n\n"
        : "The above image is a contract document. If unreadable, note it in documentNote.\n\n"
      ) + buildAnalyzePrompt("auto") },
    ];

    const result = await runAnalysis({
      apiKey,
      messages: [{ role: "user", content }],
      sourceText: null,
      deepCheck: deepCheck === true,
    });
    result.pageCount = images.length;
    return res.status(200).json(result);
  } catch (err) {
    console.error("[analyze-images]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
