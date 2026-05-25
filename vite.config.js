import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { buildAnalyzePrompt, runAnalysis, validateTextInput } from "./api/_shared.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      {
        name: "fine-print-api",
        configureServer(server) {
          const apiKey = env.LLM_API_KEY;

          async function readBody(req) {
            const chunks = [];
            for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
            return JSON.parse(Buffer.concat(chunks).toString("utf8"));
          }
          function json(res, data, status = 200) {
            res.statusCode = status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
          }

          // MOST SPECIFIC ROUTES FIRST (connect uses prefix matching)

          server.middlewares.use("/api/analyze-images", async (req, res) => {
            if (req.method !== "POST") return json(res, { error: "Method not allowed" }, 405);
            if (!apiKey) return json(res, { error: "LLM_API_KEY not set in .env" }, 500);
            try {
              const { images, deepCheck } = await readBody(req);
              if (!images || !Array.isArray(images) || images.length === 0) return json(res, { error: "No images received." }, 400);
              if (images.length > 25) return json(res, { error: "Too many pages (max 25)." }, 400);
              const content = [
                ...images.map(img => ({ type: "image", source: { type: "base64", media_type: img.fileType || "image/jpeg", data: img.base64 } })),
                { type: "text", text: (images.length > 1
                  ? "The above " + images.length + " images are sequential pages (1 to " + images.length + ") of ONE contract. Treat them as a single complete document. If any page looks unreadable or appears missing, note it in documentNote.\n\n"
                  : "The above image is a contract document. If unreadable, note it in documentNote.\n\n"
                ) + buildAnalyzePrompt("auto") },
              ];
              const result = await runAnalysis({ apiKey, messages: [{ role: "user", content }], sourceText: null, deepCheck: deepCheck === true });
              result.pageCount = images.length;
              json(res, result);
            } catch (err) { console.error("[analyze-images]", err.message); json(res, { error: err.message }, 500); }
          });

          server.middlewares.use("/api/analyze-file", async (req, res) => {
            if (req.method !== "POST") return json(res, { error: "Method not allowed" }, 405);
            if (!apiKey) return json(res, { error: "LLM_API_KEY not set in .env" }, 500);
            try {
              const { fileData, fileType, deepCheck } = await readBody(req);
              if (!fileData) return json(res, { error: "No file received." }, 400);
              const isPDF = fileType === "application/pdf";
              const fileBlock = isPDF
                ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileData } }
                : { type: "image", source: { type: "base64", media_type: fileType || "image/jpeg", data: fileData } };
              const result = await runAnalysis({
                apiKey, pdf: isPDF,
                messages: [{ role: "user", content: [fileBlock, { type: "text", text: buildAnalyzePrompt("auto") }] }],
                sourceText: null, deepCheck: deepCheck === true,
              });
              json(res, result);
            } catch (err) { console.error("[analyze-file]", err.message); json(res, { error: err.message }, 500); }
          });

          server.middlewares.use("/api/analyze", async (req, res) => {
            if (req.method !== "POST") return json(res, { error: "Method not allowed" }, 405);
            if (!apiKey) return json(res, { error: "LLM_API_KEY not set in .env" }, 500);
            try {
              const { text, contractType, deepCheck } = await readBody(req);
              const invalid = validateTextInput(text);
              if (invalid) return json(res, { error: invalid }, 400);
              const trimmed = text.slice(0, 50000);
              const result = await runAnalysis({
                apiKey,
                messages: [{ role: "user", content: buildAnalyzePrompt(contractType, trimmed) }],
                sourceText: trimmed, deepCheck: deepCheck === true,
              });
              json(res, result);
            } catch (err) { console.error("[analyze]", err.message); json(res, { error: err.message }, 500); }
          });
        },
      },
    ],
  };
});
