// backend/src/agents/agent6_poValidator.js
import { askLLM } from "./llm.js";
import { supabase } from "../supabaseClient.js";

const SYSTEM_PROMPT = `You are a PO Validation Agent for procurement.
You verify that an invoice is within the Purchase Order's budget and terms.

CHECK THESE RULES:
1. Invoice total must not exceed PO total (tolerance: 2%)
2. PO must be in 'approved' or 'open' status (not closed/cancelled)
3. Invoice items should reference items that exist on the PO
4. Flag if PO is near exhaustion (>90% consumed)

RESPOND WITH THIS EXACT JSON SCHEMA:
{
  "status": "pass" | "warn" | "fail",
  "budget_compliant": true,
  "po_status_ok": true,
  "budget_remaining": 0,
  "budget_utilization_pct": 0,
  "summary": "One-line summary",
  "issues": []
}`;

export async function runAgent6(orgId, poId, invoiceId) {
  const startMs = Date.now();

  try {
    const [poResult, invResult] = await Promise.all([
      supabase.from("purchase_orders").select("*, purchase_order_items(*)").eq("id", poId).single(),
      supabase.from("invoices").select("total_amount, invoice_number").eq("id", invoiceId).single(),
    ]);

    const po = poResult.data;
    const inv = invResult.data;
    if (!po) {
      return { status: "error", summary: `PO ${poId} not found`, latencyMs: Date.now() - startMs, agentNumber: 6, agentName: "PO Validation Agent" };
    }

    // Get all invoices against this PO to calculate consumed budget
    const { data: allInvoices } = await supabase
      .from("invoices")
      .select("total_amount, status")
      .eq("po_id", poId);

    const consumed = (allInvoices || []).reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

    const userPrompt = JSON.stringify({
      po_id: poId,
      po_total: po.total_amount,
      po_status: po.status,
      po_items: (po.purchase_order_items || []).map(i => ({ name: i.item_name, qty: i.quantity, price: i.unit_price })),
      invoice_total: inv?.total_amount,
      total_consumed_against_po: consumed,
      budget_remaining: Number(po.total_amount) - consumed,
    });

    const { parsed } = await askLLM(SYSTEM_PROMPT, userPrompt);
    return {
      ...(parsed || { status: "warn", summary: "PO evaluated with fallback parser" }),
      latencyMs: Date.now() - startMs,
      agentNumber: 6,
      agentName: "PO Validation Agent",
    };
  } catch (err) {
    return {
      status: "error",
      summary: `PO Validation error: ${err.message}`,
      latencyMs: Date.now() - startMs,
      agentNumber: 6,
      agentName: "PO Validation Agent",
      error: err.message,
    };
  }
}
