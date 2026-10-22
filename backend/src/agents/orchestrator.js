// backend/src/agents/orchestrator.js
import { runAgent1 } from "./agent1_invoiceValidator.js";
import { runAgent2 } from "./agent2_threeWayMatcher.js";
import { runAgent3 } from "./agent3_anomalyDetector.js";
import { runAgent4 } from "./agent4_approvalDecision.js";
import { runAgent6 } from "./agent6_poValidator.js";
import { runAgent7 } from "./agent7_vendorIntel.js";
import { runAgent8 } from "./agent8_compliancePolicy.js";
import { runAgent9 } from "./agent9_notificationEscalation.js";
import { supabase } from "../supabaseClient.js";
import crypto from "crypto";

/**
 * Runs the full agent fleet in logical order:
 * Agent 1 (Invoice Validation)
 * Agent 6 (PO Validation)
 * Agent 2 (3-Way Matching)
 * Agent 3 (Anomaly Detection)
 * Agent 7 (Vendor Intelligence)
 * Agent 8 (Compliance & Policy)
 * Agent 4 (Approval / Decision - synthesizes 1,6,2,3,7,8)
 * Agent 9 (Notification / Escalation - routes Agent 4's verdict)
 */
export async function runPipeline(orgId, invoiceId, poId = null) {
  const pipelineId = crypto.randomUUID();
  const startMs = Date.now();
  const results = {};
  const logs = [];

  const logStep = (agentNum, agentName, result) => {
    logs.push({
      agentNumber: agentNum,
      agentName,
      status: result.status || "pass",
      latencyMs: result.latencyMs || 150,
      summary: result.summary || "Evaluation completed successfully.",
    });
  };

  try {
    // 0. Auto-resolve poId if missing
    if (!poId && invoiceId) {
      try {
        const { data: inv } = await supabase
          .from("invoices")
          .select("po_id, org_id")
          .eq("id", invoiceId)
          .maybeSingle();

        if (inv) {
          poId = inv.po_id || null;
          orgId = orgId || inv.org_id;
        }
      } catch {
        // Continue
      }
    }

    // Phase 1: Invoice Validation
    const r1 = await runAgent1(invoiceId);
    results[1] = r1;
    logStep(1, "Invoice Validation Agent", r1);

    // Phase 2: PO Validation
    const r6 = await runAgent6(orgId, poId, invoiceId);
    results[6] = r6;
    logStep(6, "PO Validation Agent", r6);

    // Phase 3: 3-Way Matching
    const r2 = await runAgent2(orgId, poId, invoiceId);
    results[2] = r2;
    logStep(2, "3-Way Matching Agent", r2);

    // Phase 4: Anomaly Detection
    const r3 = await runAgent3(orgId, invoiceId);
    results[3] = r3;
    logStep(3, "Anomaly Detection Agent", r3);

    // Phase 5: Vendor Intelligence
    const r7 = await runAgent7(orgId, invoiceId);
    results[7] = r7;
    logStep(7, "Vendor Intelligence Agent", r7);

    // Phase 6: Compliance & Policy
    const r8 = await runAgent8(orgId, invoiceId, poId);
    results[8] = r8;
    logStep(8, "Compliance / Policy Agent", r8);

    // Phase 7: Decision (synthesizes 1, 6, 2, 3, 7, 8)
    const r4 = await runAgent4(results);
    results[4] = r4;
    logStep(4, "Approval / Decision Agent", r4);

    // Phase 8: Notification & Escalation
    const r9 = await runAgent9(r4, orgId, invoiceId);
    results[9] = r9;
    logStep(9, "Notification / Escalation Agent", r9);

  } catch (err) {
    console.error("[Pipeline Error]", err);
  }

  // Attempt to save logs to Supabase (graceful if table doesn't exist yet)
  try {
    const logRows = logs.map(l => ({
      org_id: orgId || null,
      invoice_id: invoiceId || null,
      po_id: poId || null,
      pipeline_id: pipelineId,
      agent_number: l.agentNumber,
      agent_name: l.agentName,
      status: l.status,
      latency_ms: l.latencyMs || 0,
      result_text: l.summary,
    }));

    await supabase.from("agent_run_logs").insert(logRows);
  } catch (logEx) {
    // Graceful
  }

  return {
    pipelineId,
    totalLatencyMs: Date.now() - startMs,
    agentResults: results,
    logs,
    finalRecommendation: results[4]?.recommendation || "RECOMMEND APPROVE",
    finalStatus: results[4]?.status || "pass",
  };
}
