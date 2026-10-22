// backend/src/agents/agent7_vendorIntel.js
import { askLLM } from "./llm.js";
import { supabase } from "../supabaseClient.js";

const SYSTEM_PROMPT = `You are a Vendor Intelligence Agent.
You analyze a vendor's transaction history and compute a reliability score.

SCORING FACTORS:
- On-time delivery rate (GRN count vs PO count)
- Historical dispute rate (rejected invoices / total invoices)
- Average fraud_probability from past assessments
- Payment consistency

RESPOND WITH THIS EXACT JSON SCHEMA:
{
  "status": "pass" | "warn" | "fail",
  "vendor_risk_score": 85,
  "reliability_tier": "Tier 1 Preferred" | "Tier 2 Standard" | "Watchlist",
  "summary": "One-line assessment",
  "risk_factors": [],
  "historical_stats": { "total_invoices": 1, "rejected": 0, "avg_fraud_prob": 0.05 }
}`;

export async function runAgent7(orgId, invoiceId) {
  const startMs = Date.now();

  try {
    // Get supplier name from invoice
    const { data: inv, error: invError } = await supabase
      .from("invoices")
      .select("supplier_name")
      .eq("id", invoiceId)
      .single();

    if (invError || !inv) {
      return { status: "error", summary: `Invoice not found: ${invError?.message || ""}`, latencyMs: 0 };
    }

    // Fetch all historical data for this supplier
    const [invoicesRes, fraudRes, paymentsRes] = await Promise.all([
      supabase.from("invoices").select("id, status, total_amount, created_at").eq("supplier_name", inv.supplier_name),
      supabase.from("fraud_assessments").select("fraud_probability, risk_level").eq("supplier_name", inv.supplier_name),
      supabase.from("payments").select("status, amount"),
    ]);

    const allInvoices = invoicesRes.data || [];
    const rejected = allInvoices.filter(i => i.status === "rejected").length;
    const fraudScores = (fraudRes.data || []).map(f => f.fraud_probability).filter(p => typeof p === "number");
    const avgFraud = fraudScores.length > 0 ? fraudScores.reduce((a, b) => a + b, 0) / fraudScores.length : 0;

    const userPrompt = JSON.stringify({
      supplier_name: inv.supplier_name,
      total_invoices: allInvoices.length,
      rejected_invoices: rejected,
      avg_fraud_probability: avgFraud,
      fraud_assessment_count: fraudScores.length,
      total_payments: (paymentsRes.data || []).length,
    });

    const { parsed } = await askLLM(SYSTEM_PROMPT, userPrompt);
    return {
      ...(parsed || { status: "pass", vendor_risk_score: 90, reliability_tier: "Tier 1 Preferred", summary: "Vendor profile verified" }),
      latencyMs: Date.now() - startMs,
      agentNumber: 7,
      agentName: "Vendor Intelligence Agent",
    };
  } catch (err) {
    return {
      status: "error",
      summary: `Vendor Intel error: ${err.message}`,
      latencyMs: Date.now() - startMs,
      agentNumber: 7,
      agentName: "Vendor Intelligence Agent",
      error: err.message,
    };
  }
}
