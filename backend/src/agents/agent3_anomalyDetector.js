// backend/src/agents/agent3_anomalyDetector.js
import { askLLM } from "./llm.js";
import { supabase } from "../supabaseClient.js";

const SYSTEM_PROMPT = `You are an Anomaly Detection Agent for procurement fraud.
You receive statistical features about an invoice and its supplier's history.
Analyze these features and assess the fraud probability.

KEY SIGNALS TO CHECK:
- amount_to_supplier_avg_ratio > 2.0 = suspicious
- late_night_submission (22:00-05:00) = flag
- supplier_invoice_count_30d spike vs historical = suspicious
- amount_deviation_from_supplier > 2 std deviations = high risk

RESPOND WITH THIS EXACT JSON SCHEMA:
{
  "status": "pass" | "warn" | "fail",
  "fraud_probability": 0.05,
  "risk_level": "low" | "medium" | "high" | "critical",
  "summary": "One-line analysis",
  "risk_factors": ["list of specific risk signals detected"],
  "shap_like_factors": { "factor_name": 0.1 }
}`;

export async function runAgent3(orgId, invoiceId) {
  const startMs = Date.now();

  try {
    // 1. Fetch invoice
    const { data: inv, error: invError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invError || !inv) {
      return { status: "error", summary: `Invoice not found: ${invError?.message || ""}`, latencyMs: 0 };
    }

    // 2. Fetch supplier history
    const { data: supplierInvoices } = await supabase
      .from("invoices")
      .select("total_amount, created_at")
      .eq("supplier_name", inv.supplier_name);

    const amounts = (supplierInvoices || []).map(i => Number(i.total_amount) || 0);
    const mean = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : Number(inv.total_amount);
    const std = amounts.length > 1
      ? Math.sqrt(amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (amounts.length - 1))
      : 0;

    const invHour = new Date(inv.created_at || Date.now()).getHours();
    const count30d = (supplierInvoices || []).filter(i =>
      Date.now() - new Date(i.created_at).getTime() <= 30 * 86400000
    ).length;

    const features = {
      invoice_amount: Number(inv.total_amount),
      supplier_mean_amount: mean,
      supplier_std_amount: std,
      amount_to_supplier_avg_ratio: Number(inv.total_amount) / (mean + 1),
      amount_deviation_from_supplier: std > 0 ? Math.abs(Number(inv.total_amount) - mean) / std : 0,
      supplier_total_invoices: amounts.length,
      supplier_invoice_count_30d: count30d,
      submission_hour: invHour,
      late_night_submission: invHour >= 22 || invHour <= 5,
      invoice_date: inv.invoice_date,
    };

    // 3. Call Groq for analysis
    const { parsed } = await askLLM(SYSTEM_PROMPT, JSON.stringify(features));
    const totalLatency = Date.now() - startMs;

    // 4. Store result in fraud_assessments table if possible
    if (parsed) {
      const upsertData = {
        org_id: orgId,
        invoice_id: invoiceId,
        po_id: inv.po_id || null,
        fraud_probability: parsed.fraud_probability || 0.1,
        is_fraud: (parsed.fraud_probability || 0) >= 0.8,
        risk_level: parsed.risk_level || "low",
        feature_contributions: parsed.shap_like_factors || {},
        supplier_name: inv.supplier_name,
        invoice_amount: inv.total_amount,
      };

      const { data: existing } = await supabase
        .from("fraud_assessments")
        .select("id")
        .eq("invoice_id", invoiceId)
        .maybeSingle();

      if (existing) {
        await supabase.from("fraud_assessments").update(upsertData).eq("id", existing.id);
      } else {
        await supabase.from("fraud_assessments").insert([upsertData]);
      }
    }

    return {
      ...(parsed || { status: "warn", summary: "Anomaly features evaluated, LLM parse fallback", fraud_probability: 0.1, risk_level: "low" }),
      latencyMs: totalLatency,
      agentNumber: 3,
      agentName: "Anomaly Detection Agent",
    };
  } catch (err) {
    return {
      status: "error",
      summary: `Anomaly detection error: ${err.message}`,
      latencyMs: Date.now() - startMs,
      agentNumber: 3,
      agentName: "Anomaly Detection Agent",
      error: err.message,
    };
  }
}
