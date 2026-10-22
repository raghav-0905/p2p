// backend/src/agents/llm.js
import dotenv from "dotenv";
dotenv.config();

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Candidate models in order of priority (handles account model access automatically)
const CANDIDATE_MODELS = [
  process.env.LLM_MODEL,
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile",
].filter(Boolean);

let verifiedWorkingModel = null;

/**
 * Call Groq with a system instruction + user prompt.
 * Uses native fetch with response_format: { type: "json_object" } for guaranteed JSON output.
 * Automatically tries available models if one returns 404 model_not_found.
 *
 * @param {string} systemPrompt – Agent's persona, rules, and expected JSON schema
 * @param {string} userPrompt   – The actual data/question
 * @param {string} preferredModel – Optional model override
 * @returns {Promise<{ parsed: object|null, raw: string, latencyMs: number, error?: string }>}
 */
export async function askLLM(systemPrompt, userPrompt, preferredModel = null) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey || apiKey === "your_llm_api_key_here") {
    return {
      parsed: null,
      raw: "Missing LLM_API_KEY",
      latencyMs: 120,
      error: "LLM_API_KEY missing",
    };
  }

  const startMs = Date.now();
  const modelsToTry = preferredModel
    ? [preferredModel, ...CANDIDATE_MODELS]
    : (verifiedWorkingModel ? [verifiedWorkingModel, ...CANDIDATE_MODELS] : CANDIDATE_MODELS);

  // Remove duplicates while preserving order
  const uniqueModels = [...new Set(modelsToTry)];

  for (const model of uniqueModels) {
    try {
      const res = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        // If model not found or forbidden on this key, try next candidate model
        if (res.status === 404 || res.status === 400) {
          continue;
        }
        throw new Error(`Groq HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || "{}";
      const latencyMs = Date.now() - startMs;

      verifiedWorkingModel = model;

      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.warn("[LLM] Non-JSON response, returning raw text");
      }

      return { parsed, raw, latencyMs, modelUsed: model };
    } catch (err) {
      // Continue to next model if available
    }
  }

  return {
    parsed: null,
    raw: "All candidate models exhausted",
    latencyMs: Date.now() - startMs,
  };
}
