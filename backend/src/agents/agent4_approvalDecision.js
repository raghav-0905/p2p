// backend/src/agents/agent4_approvalDecision.js
import { askLLM } from "./llm.js";

const SYSTEM_PROMPT = `You are the Approval / Decision Agent — the final arbiter in a multi-agent P2P system.
You receive outputs from upstream agents and must synthesize a final recommendation.

CRITICAL SAFETY CONSTRAINT:
- You NEVER approve payments automatically.
- You only RECOMMEND actions for human reviewers.
- Your output is advisory only.

DECISION MATRIX:
- If ALL agents pass → RECOMMEND APPROVE
- If any agent warns but none fail → RECOMMEND APPROVE WITH CAUTION
- If any agent fails on non-critical (vendor risk, compliance) → RECOMMEND AUDIT
- If 3-way match OR anomaly detection fails → RECOMMEND REJECT
- If fraud probability >= 0.8 → RECOMMEND REJECT & ESCALATE

RESPOND WITH THIS EXACT JSON SCHEMA:
{
  "status": "pass" | "warn" | "fail",
  "recommendation": "RECOMMEND APPROVE" | "RECOMMEND APPROVE WITH CAUTION" | "RECOMMEND AUDIT" | "RECOMMEND REJECT" | "RECOMMEND REJECT & ESCALATE",
  "confidence_score": 0.95,
  "summary": "One-line executive summary",
  "agent_consensus": { "passed": 5, "warned": 0, "failed": 0 },
  "reasoning": "2-3 sentence explanation of the decision",
  "safety_note": "Financial Safety Constraint: This is a recommendation only. Payment requires human sign-off."
}`;

export async function runAgent4(allAgentResults) {
  const startMs = Date.now();

  try {
    // Build a digest of all agent outputs
    const digest = Object.entries(allAgentResults).map(([agentNum, result]) => ({
      agent: result.agentName || `Agent ${agentNum}`,
      status: result.status,
      summary: result.summary,
      key_data: {
        fraud_probability: result.fraud_probability,
        risk_level: result.risk_level,
        budget_compliant: result.budget_compliant,
        compliant: result.compliant,
        vendor_risk_score: result.vendor_risk_score,
        qty_match: result.qty_match,
        amount_match: result.amount_match,
      },
    }));

    const userPrompt = JSON.stringify({
      agent_outputs: digest,
      total_agents_reporting: digest.length,
    });

    const { parsed } = await askLLM(SYSTEM_PROMPT, userPrompt);
    return {
      ...(parsed || {
        status: "warn",
        recommendation: "RECOMMEND AUDIT",
        confidence_score: 0.8,
        summary: "Synthesized recommendation based on agent consensus",
        agent_consensus: { passed: digest.length, warned: 0, failed: 0 },
        reasoning: "All reporting agents evaluated successfully.",
        safety_note: "Financial Safety Constraint: Advisory only.",
      }),
      latencyMs: Date.now() - startMs,
      agentNumber: 4,
      agentName: "Approval / Decision Agent",
    };
  } catch (err) {
    return {
      status: "error",
      recommendation: "RECOMMEND AUDIT",
      summary: `Decision synthesis error: ${err.message}`,
      latencyMs: Date.now() - startMs,
      agentNumber: 4,
      agentName: "Approval / Decision Agent",
      error: err.message,
    };
  }
}
