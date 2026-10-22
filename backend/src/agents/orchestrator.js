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
      status: result.status || "error",
      latencyMs: result.latencyMs || 0,
      summary: result.summary || result.error || "Unknown",
    });
  };

  try {
    // 0. Auto-resolve poId if missing
    if (!poId) {
      const { data: inv } = await supabase
        .from("invoices")
        .select("po_id, org_id")
        .eq("id", invoiceId)
        .single();

      if (inv) {
        poId = inv.po_id || null;
        orgId = orgId || inv.org_id;
      }
    }

    // Phase 1: Invoice Validation
    const r1 = await runAgent1(invoiceId);
    results[1] = r1;
    logStep(1, "Invoice Validation Agent", r1);

    // Phase 2: PO Validation (if PO exists)
    if (poId) {
      const r6 = await runAgent6(orgId, poId, invoiceId);
      results[6] = r6;
      logStep(6, "PO Validation Agent", r6);
    } else {
      results[6] = {
        status: "warn",
        summary: "No PO linked to this invoice; skipping PO budget checks",
        latencyMs: 0,
        agentNumber: 6,
        agentName: "PO Validation Agent",
      };
      logStep(6, "PO Validation Agent", results[6]);
    }

    // Phase 3: 3-Way Matching (if PO exists)
    if (poId) {
      const r2 = await runAgent2(orgId, poId, invoiceId);
      results[2] = r2;
      logStep(2, "3-Way Matching Agent", r2);
    } else {
      results[2] = {
        status: "warn",
        summary: "No PO linked; 3-way match bypassed for standalone invoice",
        latencyMs: 0,
        agentNumber: 2,
        agentName: "3-Way Matching Agent",
      };
      logStep(2, "3-Way Matching Agent", results[2]);
    }

    // Phase 4: Anomaly Detection
    const r3 = await runAgent3(orgId, invoiceId);
    results[3] = r3;
    logStep(3, "Anomaly Detection Agent", r3);

    // Phase 5: Vendor Intelligence
    const r7 = await runAgent7(orgId, invoiceId);
    results[7] = r7;
    logStep(7, "Vendor Intelligence Agent", r7);

    // Phase 6: Compliance
    const r8 = await runAgent8(orgId, invoiceId, poId);
    results[8] = r8;
    logStep(8, "Compliance / Policy Agent", r8);

    // Phase 7: Decision (synthesizes all above)
    const r4 = await runAgent4(results);
    results[4] = r4;
    logStep(4, "Approval / Decision Agent", r4);

    // Phase 8: Notification & Escalation
    const r9 = await runAgent9(r4, orgId, invoiceId);
    results[9] = r9;
    logStep(9, "Notification / Escalation Agent", r9);

  } catch (err) {
    console.error("[Pipeline Error]", err);
    logs.push({ agentNumber: 0, agentName: "Pipeline", status: "error", summary: err.message });
  }

  // Attempt to save logs to Supabase (graceful if table doesn't exist yet)
  try {
    const logRows = logs.map(l => ({
      org_id: orgId || null,
      invoice_id: invoiceId,
      po_id: poId || null,
      pipeline_id: pipelineId,
      agent_number: l.agentNumber,
      agent_name: l.agentName,
      status: l.status,
      latency_ms: l.latencyMs || 0,
      result_text: l.summary,
    }));

    const { error: logErr } = await supabase.from("agent_run_logs").insert(logRows);
    if (logErr) {
      console.warn("[Pipeline] Note: Could not insert into agent_run_logs:", logErr.message);
    }
  } catch (logEx) {
    console.warn("[Pipeline] Supabase log write skipped:", logEx.message);
  }

  return {
    pipelineId,
    totalLatencyMs: Date.now() - startMs,
    agentResults: results,
    logs,
    finalRecommendation: results[4]?.recommendation || "RECOMMEND AUDIT",
    finalStatus: results[4]?.status || "warn",
  };
}
