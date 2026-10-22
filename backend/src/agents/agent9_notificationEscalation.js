// backend/src/agents/agent9_notificationEscalation.js
import { askLLM } from "./llm.js";

const SYSTEM_PROMPT = `You are the Notification & Escalation Agent.
Based on the Decision Agent's recommendation, determine the routing.

ROUTING RULES:
- RECOMMEND APPROVE → Route to Accounts Payable queue
- RECOMMEND APPROVE WITH CAUTION → Route to Accounts Payable + flag for senior review
- RECOMMEND AUDIT → Route to Internal Audit team
- RECOMMEND REJECT → Route to Procurement Manager + block payment
- RECOMMEND REJECT & ESCALATE → CRITICAL: Route to Head of Internal Audit + CFO

RESPOND WITH THIS EXACT JSON SCHEMA:
{
  "status": "pass" | "warn" | "fail",
  "summary": "One-line dispatch confirmation",
  "severity": "low" | "medium" | "high" | "critical",
  "routed_to": ["Accounts Payable"],
  "actions_taken": ["Queued for review"],
  "audit_log_entry": "Timestamped record of this decision"
}`;

export async function runAgent9(decisionResult, orgId, invoiceId) {
  const startMs = Date.now();

  try {
    const userPrompt = JSON.stringify({
      recommendation: decisionResult?.recommendation || "UNKNOWN",
      confidence: decisionResult?.confidence_score || 0.5,
      reasoning: decisionResult?.reasoning || "",
      invoice_id: invoiceId,
      timestamp: new Date().toISOString(),
    });

    const { parsed } = await askLLM(SYSTEM_PROMPT, userPrompt);
    return {
      ...(parsed || {
        status: "pass",
        summary: `Dispatch recorded: ${decisionResult?.recommendation}`,
        severity: "low",
        routed_to: ["Accounts Payable"],
        actions_taken: ["Notification logged to audit trail"],
        audit_log_entry: `Invoice ${invoiceId} processed at ${new Date().toISOString()}`,
      }),
      latencyMs: Date.now() - startMs,
      agentNumber: 9,
      agentName: "Notification / Escalation Agent",
    };
  } catch (err) {
    return {
      status: "error",
      summary: `Notification dispatch error: ${err.message}`,
      latencyMs: Date.now() - startMs,
      agentNumber: 9,
      agentName: "Notification / Escalation Agent",
      error: err.message,
    };
  }
}
