// backend/src/agents/agent2_threeWayMatcher.js
import { askLLM } from "./llm.js";
import { perform3WayMatch } from "../services/matchingService.js";

const SYSTEM_PROMPT = `You are a 3-Way Matching Agent for procurement.
You receive the raw output of a PO-GRN-Invoice comparison engine.
Your job is to interpret the results and produce a clear verdict.

RESPOND WITH THIS EXACT JSON SCHEMA:
{
  "status": "pass" | "warn" | "fail",
  "summary": "One-line summary e.g. '3-Way Match SUCCESS. All quantities and prices align.'",
  "qty_match": true,
  "amount_match": true,
  "amount_diff": 0,
  "mismatched_items": ["list of item-level issues"],
  "recommendation": "proceed_to_payment" | "request_credit_note" | "hold_for_review"
}`;

export async function runAgent2(orgId, poId, invoiceId) {
  const startMs = Date.now();

  try {
    // 1. Use existing matching service (real Supabase queries)
    const matchResult = await perform3WayMatch(orgId, poId, null, invoiceId);

    // 2. Feed raw match result to Groq for interpretation
    const userPrompt = JSON.stringify({
      match_service_output: matchResult,
      context: "Analyze this 3-way match result and provide your assessment.",
    });

    const { parsed, latencyMs: llmLatency } = await askLLM(SYSTEM_PROMPT, userPrompt);
    const totalLatency = Date.now() - startMs;

    return {
      ...(parsed || { status: "fail", summary: "Failed to parse 3-way match LLM verdict" }),
      latencyMs: totalLatency,
      agentNumber: 2,
      agentName: "3-Way Matching Agent",
      rawMatchResult: matchResult, // Keep original for audit trail
    };
  } catch (err) {
    return {
      status: "fail",
      summary: `3-Way Match error: ${err.message}`,
      latencyMs: Date.now() - startMs,
      agentNumber: 2,
      agentName: "3-Way Matching Agent",
      error: err.message,
    };
  }
}
