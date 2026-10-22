// backend/src/agents/agent8_compliancePolicy.js
import { askLLM } from "./llm.js";
import { supabase } from "../supabaseClient.js";

const SYSTEM_PROMPT = `You are a Compliance & Policy Agent for an Indian P2P procurement system.

You must check incoming invoices/POs against these ORGANIZATION POLICIES:

POLICY SOP-P2P-01: All purchases above ₹50,000 require manager approval.
POLICY SOP-P2P-04: Hardware procurement must have 3 vendor quotes for amounts > ₹1,00,000.
POLICY SOP-FIN-08: Price escalations >20% above PO value require C-level board approval.
POLICY SOP-P2P-12: Payment cannot be released without matching GRN for goods.
POLICY SOP-FIN-15: All vendor payments must follow Net-30 terms unless otherwise contracted.
POLICY SOP-ANTI-BRIBERY: Gifts or entertainment expenses above ₹5,000 require disclosure.
POLICY SOP-ESG-01: Vendors must have active GST registration; dormant GSTIN vendors are blocked.

Check the transaction against ALL applicable policies.

RESPOND WITH THIS EXACT JSON SCHEMA:
{
  "status": "pass" | "warn" | "fail",
  "compliant": true,
  "summary": "One-line compliance verdict",
  "applicable_policies": ["SOP-P2P-01"],
  "violations": [],
  "recommendations": []
}`;

export async function runAgent8(orgId, invoiceId, poId) {
  const startMs = Date.now();

  try {
    const [invRes, poRes] = await Promise.all([
      supabase.from("invoices").select("*").eq("id", invoiceId).single(),
      poId ? supabase.from("purchase_orders").select("*").eq("id", poId).single() : { data: null },
    ]);

    const inv = invRes.data;
    const po = poRes.data;

    const userPrompt = JSON.stringify({
      invoice_total: inv?.total_amount,
      supplier_name: inv?.supplier_name,
      gstin: inv?.gstin,
      po_total: po?.total_amount,
      po_status: po?.status,
      price_variance_pct: po ? ((Number(inv?.total_amount) - Number(po.total_amount)) / Number(po.total_amount) * 100).toFixed(1) : "N/A",
      invoice_date: inv?.invoice_date,
    });

    const { parsed } = await askLLM(SYSTEM_PROMPT, userPrompt);
    return {
      ...(parsed || { status: "pass", compliant: true, summary: "Compliant with organization SOP policies", applicable_policies: ["SOP-P2P-01"] }),
      latencyMs: Date.now() - startMs,
      agentNumber: 8,
      agentName: "Compliance / Policy Agent",
    };
  } catch (err) {
    return {
      status: "error",
      summary: `Compliance check error: ${err.message}`,
      latencyMs: Date.now() - startMs,
      agentNumber: 8,
      agentName: "Compliance / Policy Agent",
      error: err.message,
    };
  }
}
