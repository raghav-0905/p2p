// backend/src/agents/agent1_invoiceValidator.js
import { askLLM } from "./llm.js";
import { supabase } from "../supabaseClient.js";

const SYSTEM_PROMPT = `You are an Invoice Validation Agent for a P2P procurement system.
You validate Indian GST invoices for completeness and correctness.

CHECK THESE RULES:
1. GSTIN must be exactly 15 characters, matching pattern: 2-digit state code + 10-char PAN + 1 entity code + 1 Z + 1 checksum
2. Math validation: sum of all line item totals must equal the invoice total_amount (±₹1 rounding tolerance)
3. Date freshness: invoice_date must not be older than 180 days from today
4. Duplicate detection: if duplicate_exists is true, flag it

RESPOND WITH THIS EXACT JSON SCHEMA:
{
  "status": "pass" | "warn" | "fail",
  "gstin_valid": true,
  "math_valid": true,
  "date_valid": true,
  "duplicate_detected": false,
  "summary": "One-line human-readable summary of the validation result",
  "issues": ["list of specific issues found, empty if none"]
}`;

export async function runAgent1(invoiceId) {
  // 1. Fetch invoice + items from Supabase
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) {
    return { status: "error", summary: `Invoice not found: ${error?.message || ""}`, latencyMs: 0 };
  }

  // 2. Check for duplicates in DB
  const { data: dupes } = await supabase
    .from("invoices")
    .select("id")
    .eq("invoice_number", invoice.invoice_number)
    .neq("id", invoiceId);

  const duplicateExists = Boolean(dupes && dupes.length > 0);

  // 3. Build the prompt with real data
  const userPrompt = JSON.stringify({
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    supplier_name: invoice.supplier_name,
    gstin: invoice.gstin || "NOT_PROVIDED",
    total_amount: invoice.total_amount,
    line_items: (invoice.invoice_items || []).map(item => ({
      name: item.item_name_snapshot,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total_amount,
    })),
    duplicate_exists: duplicateExists,
    today: new Date().toISOString().split("T")[0],
  });

  // 4. Call Groq
  const { parsed, latencyMs } = await askLLM(SYSTEM_PROMPT, userPrompt);

  return {
    ...(parsed || { status: "fail", summary: "LLM response parsing failed", issues: ["LLM returned invalid output"] }),
    latencyMs,
    agentNumber: 1,
    agentName: "Invoice Validation Agent",
  };
}
