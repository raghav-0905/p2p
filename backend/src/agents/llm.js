// backend/src/agents/llm.js
import dotenv from "dotenv";
dotenv.config();

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = process.env.LLM_MODEL || "llama-3.3-70b-versatile";

/**
 * Call Groq with a system instruction + user prompt.
 * Uses native fetch with response_format: { type: "json_object" } for guaranteed JSON output.
 *
 * @param {string} systemPrompt – Agent's persona, rules, and expected JSON schema
 * @param {string} userPrompt   – The actual data/question
 * @param {string} model        – Model to use (default: llama-3.3-70b-versatile)
 * @returns {Promise<{ parsed: object|null, raw: string, latencyMs: number, error?: string }>}
 */
export async function askLLM(systemPrompt, userPrompt, model = DEFAULT_MODEL) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey || apiKey === "your_llm_api_key_here") {
    console.error("[LLM] LLM_API_KEY is not configured in backend/.env");
    return {
      parsed: null,
      raw: "Missing LLM_API_KEY in backend/.env",
      latencyMs: 0,
      error: "LLM_API_KEY missing",
    };
  }

  const startMs = Date.now();

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1, // Low temperature = deterministic agent output
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const latencyMs = Date.now() - startMs;

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn("[LLM] Non-JSON response, returning raw text");
    }

    return { parsed, raw, latencyMs };
  } catch (err) {
    console.error("[LLM Error]", err.message);
    return {
      parsed: null,
      raw: err.message,
      latencyMs: Date.now() - startMs,
      error: err.message,
    };
  }
}
