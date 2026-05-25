import { buildAnalyzePrompt, runAnalysis, validateTextInput } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Server not configured. API key missing." });

  const { text, contractType, deepCheck } = req.body || {};
  const invalid = validateTextInput(text);
  if (invalid) return res.status(400).json({ error: invalid });

  try {
    const trimmed = text.slice(0, 50000);
    const result = await runAnalysis({
      apiKey,
      messages: [{ role: "user", content: buildAnalyzePrompt(contractType, trimmed) }],
      sourceText: trimmed,
      deepCheck: deepCheck === true,
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error("[analyze]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
