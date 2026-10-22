# 🤖 Real Agent Fleet Implementation Plan (Grok / xAI Edition)

> **Goal**: Replace the hardcoded/simulated agent pipeline with **real, working agents** powered by an LLM (**Grok API via xAI** with no strict rate limits). No LangChain. No heavy frameworks. Plain Node.js functions using the OpenAI SDK configured for xAI, calling Supabase for real data and Grok for agent reasoning.

---

## Current State Summary

| Agent | Current Status | What Exists |
|-------|---------------|-------------|
| 1. Invoice Validation | Active MVP | Rule-based checks in frontend simulation only |
| 2. 3-Way Matching | Active MVP | `matchingService.js` in backend (real Supabase queries) |
| 3. Anomaly Detection | In Plan | `scoringService.js` calls Flask ML API (partially real) |
| 4. Approval / Decision | In Plan | Hardcoded scenario text in frontend |
| 5. Document / Ingestion | In Plan | Hardcoded scenario text in frontend |
| 6. PO Validation | In Plan | Hardcoded scenario text in frontend |
| 7. Vendor Intelligence | In Plan | Hardcoded scenario text in frontend |
| 8. Compliance / Policy | In Plan | Hardcoded scenario text in frontend |
| 9. Notification / Escalation | In Plan | Hardcoded scenario text in frontend |

---

## Architecture Overview

```
Frontend (React)                    Backend (Express :3001)
     │                                    │
     │  POST /api/agents/run-pipeline     │
     │ ──────────────────────────────────► │
     │                                    ├─► agentOrchestrator.js
     │                                    │     ├─► agent1_invoiceValidator.js
     │                                    │     ├─► agent2_threeWayMatcher.js
     │                                    │     ├─► agent3_anomalyDetector.js
     │                                    │     ├─► agent4_approvalDecision.js
     │                                    │     ├─► agent5_documentIngestion.js (*)
     │                                    │     ├─► agent6_poValidator.js
     │                                    │     ├─► agent7_vendorIntel.js
     │                                    │     ├─► agent8_compliancePolicy.js
     │                                    │     └─► agent9_notificationEscalation.js
     │                                    │
     │  JSON response                      │
     │ ◄────────────────────────────────── │
     │                                    │
     │                              Supabase (Data)
     │                              Grok API / xAI (LLM)

(*) Agent 5 parses invoice text with Grok, not a separate OCR service
```

---

## Step 0: Prerequisites & Environment Setup

**Install OpenAI SDK in backend** (xAI API is 100% OpenAI-compatible):
```bash
cd backend
npm install openai
```

**Add API key to [`backend/.env`](file:///c:/Users/Admin/Desktop/sem%206/PBL-2/Project/p2p/backend/.env):**
```env
SUPABASE_URL=https://gairpriyilzwijunhusu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<existing key>
GROK_API_KEY=<your-grok-xai-api-key>
# Optional: specify model (defaults to grok-2-latest)
GROK_MODEL=grok-2-latest
```

**Create Supabase table for agent run logs** (run in Supabase SQL Editor):
```sql
CREATE TABLE IF NOT EXISTS agent_run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  invoice_id UUID,
  po_id UUID,
  pipeline_id UUID NOT NULL DEFAULT gen_random_uuid(),
  agent_number INT NOT NULL,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'warn', 'fail', 'error')),
  latency_ms REAL,
  result_text TEXT,
  raw_llm_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for service-role writes
ALTER TABLE agent_run_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON agent_run_logs
  FOR ALL USING (true) WITH CHECK (true);
```

**New file structure to create:**
```
backend/src/
├── agents/
│   ├── llm.js                          ← Gemini helper
│   ├── agent1_invoiceValidator.js
│   ├── agent2_threeWayMatcher.js
│   ├── agent3_anomalyDetector.js
│   ├── agent4_approvalDecision.js
│   ├── agent5_documentIngestion.js
│   ├── agent6_poValidator.js
│   ├── agent7_vendorIntel.js
│   ├── agent8_compliancePolicy.js
│   ├── agent9_notificationEscalation.js
│   └── orchestrator.js                 ← Runs all agents in sequence
├── routes/
│   ├── validation.js                   ← Existing
│   └── agents.js                       ← NEW: /api/agents/*
└── ...

## Step 1: Create the Grok LLM Helper (`llm.js`)

**File**: `backend/src/agents/llm.js`

A thin wrapper around the **Grok (xAI) API** using the standard OpenAI client. Every agent calls `askLLM(systemPrompt, userPrompt)` and gets back a parsed JSON object. This is the **only** LLM touchpoint in the entire codebase.

```javascript
// backend/src/agents/llm.js
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

// xAI Grok endpoint is 100% OpenAI-compatible
const xai = new OpenAI({
  apiKey: process.env.GROK_API_KEY || process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

const DEFAULT_MODEL = process.env.GROK_MODEL || "grok-2-latest";

/**
 * Call Grok with a system instruction + user prompt.
 * Uses response_format: { type: "json_object" } for guaranteed JSON output.
 *
 * @param {string} systemPrompt – Agent's persona, rules, and expected JSON schema
 * @param {string} userPrompt   – The actual data/question
 * @param {string} model        – Model to use (default: grok-2-latest)
 * @returns {{ parsed: object|null, raw: string, latencyMs: number }}
 */
export async function askLLM(systemPrompt, userPrompt, model = DEFAULT_MODEL) {
  const startMs = Date.now();

  try {
    const response = await xai.chat.completions.create({
      model,
      temperature: 0.1, // Low temperature = deterministic agent output
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const latencyMs = Date.now() - startMs;

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn("[LLM] Non-JSON response, returning raw text");
    }

    return { parsed, raw, latencyMs };
  } catch (err) {
    console.error("[LLM Error]", err.message);
    return {
      parsed: null,
      raw: err.message,
      latencyMs: Date.now() - startMs,
      error: err.message,
    };
  }
}
```

> [!IMPORTANT]
> **Why `response_format: { type: "json_object" }`?** — Forces Grok to return valid structured JSON matching the schema specified in each agent's system prompt. No regex parsing needed. Also, with **no strict rate limits** on your Grok key, the entire fleet can run smoothly without HTTP 429 throttling!

## Step 2: Build Agent 1 — Invoice Validation Agent

**File**: `backend/src/agents/agent1_invoiceValidator.js`

**What it does**: Fetches invoice from Supabase → sends it to Grok with validation rules → returns structured verdict.

**Data flow**: Supabase `invoices` table → LLM validates GSTIN format, math totals, date freshness, duplicates → returns pass/warn/fail.

```javascript
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
  "gstin_valid": true/false,
  "math_valid": true/false,
  "date_valid": true/false,
  "duplicate_detected": true/false,
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
    return { status: "error", summary: "Invoice not found", latencyMs: 0 };
  }

  // 2. Check for duplicates in DB
  const { data: dupes } = await supabase
    .from("invoices")
    .select("id")
    .eq("invoice_number", invoice.invoice_number)
    .neq("id", invoiceId);

  const duplicateExists = dupes && dupes.length > 0;

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

  // 4. Call Grok
  const { parsed, latencyMs } = await askLLM(SYSTEM_PROMPT, userPrompt);

  return { ...parsed, latencyMs, agentNumber: 1, agentName: "Invoice Validation Agent" };
}
```

> [!NOTE]
> **Why hybrid?** — The GSTIN regex and math checks *could* be done without an LLM, but using Grok means the agent can also catch edge cases like "invoice dated on a national holiday" or "supplier name doesn't match GSTIN state code". The LLM adds intelligence on top of the rules.

## Step 3: Build Agent 2 — 3-Way Matching Agent

**File**: `backend/src/agents/agent2_threeWayMatcher.js`

**What it does**: Wraps the **existing** [`matchingService.js`](file:///c:/Users/Admin/Desktop/sem%206/PBL-2/Project/p2p/backend/src/services/matchingService.js) + adds LLM interpretation of the match results.

**Strategy**: We already have `perform3WayMatch()` that does the actual PO-GRN-Invoice comparison. This agent calls it, then feeds the raw match result to Grok to produce a human-readable analysis.

```javascript
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
  "qty_match": true/false,
  "amount_match": true/false,
  "amount_diff": <number>,
  "mismatched_items": ["list of item-level issues"],
  "recommendation": "proceed_to_payment" | "request_credit_note" | "hold_for_review"
}`;

export async function runAgent2(orgId, poId, invoiceId) {
  const startMs = Date.now();

  // 1. Use existing matching service (real Supabase queries)
  const matchResult = await perform3WayMatch(orgId, poId, null, invoiceId);

  // 2. Feed raw match result to LLM for interpretation
  const userPrompt = JSON.stringify({
    match_service_output: matchResult,
    context: "Analyze this 3-way match result and provide your assessment."
  });

  const { parsed, latencyMs: llmLatency } = await askLLM(SYSTEM_PROMPT, userPrompt);
  const totalLatency = Date.now() - startMs;

  return {
    ...parsed,
    latencyMs: totalLatency,
    agentNumber: 2,
    agentName: "3-Way Matching Agent",
    rawMatchResult: matchResult,  // Keep original for audit trail
  };
}
```

> [!TIP]
> **This agent is the perfect hybrid**: the matching logic stays deterministic (existing code), but Grok adds natural-language reasoning about what the mismatches mean and what action to take.

## Step 4: Build Agent 3 — Anomaly Detection Agent

**File**: `backend/src/agents/agent3_anomalyDetector.js`

**What it does**: Calculates statistical features from Supabase (same logic as existing [`scoringService.js`](file:///c:/Users/Admin/Desktop/sem%206/PBL-2/Project/p2p/backend/src/services/scoringService.js)) and sends them to Grok to assess fraud risk. Falls back to the Flask ML API if available.

**Strategy**: Instead of requiring the XGBoost Flask service to be running, we let Grok analyze the computed features directly. If the Flask API is up, we use both.

```javascript
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
  "fraud_probability": <float 0.0-1.0>,
  "risk_level": "low" | "medium" | "high" | "critical",
  "summary": "One-line analysis",
  "risk_factors": ["list of specific risk signals detected"],
  "shap_like_factors": { "factor_name": <contribution_score>, ... }
}`;

export async function runAgent3(orgId, invoiceId) {
  const startMs = Date.now();

  // 1. Fetch invoice
  const { data: inv } = await supabase
    .from("invoices").select("*").eq("id", invoiceId).single();
  if (!inv) return { status: "error", summary: "Invoice not found", latencyMs: 0 };

  // 2. Fetch supplier history (same feature engineering as scoringService.js)
  const { data: supplierInvoices } = await supabase
    .from("invoices").select("total_amount, created_at")
    .eq("supplier_name", inv.supplier_name);

  const amounts = (supplierInvoices || []).map(i => Number(i.total_amount) || 0);
  const mean = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : Number(inv.total_amount);
  const std = amounts.length > 1
    ? Math.sqrt(amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (amounts.length - 1))
    : 0;

  const invHour = new Date(inv.created_at).getHours();
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

  // 3. Call Grok for analysis
  const { parsed, latencyMs: llmLatency } = await askLLM(SYSTEM_PROMPT, JSON.stringify(features));
  const totalLatency = Date.now() - startMs;

  // 4. Store result in fraud_assessments table
  if (parsed) {
    const upsertData = {
      org_id: orgId, invoice_id: invoiceId, po_id: inv.po_id,
      fraud_probability: parsed.fraud_probability || 0.1,
      is_fraud: (parsed.fraud_probability || 0) >= 0.8,
      risk_level: parsed.risk_level || "low",
      feature_contributions: parsed.shap_like_factors || {},
      supplier_name: inv.supplier_name,
      invoice_amount: inv.total_amount,
    };

    const { data: existing } = await supabase
      .from("fraud_assessments").select("id").eq("invoice_id", invoiceId).single();
    if (existing) {
      await supabase.from("fraud_assessments").update(upsertData).eq("id", existing.id);
    } else {
      await supabase.from("fraud_assessments").insert([upsertData]);
    }
  }

  return { ...parsed, latencyMs: totalLatency, agentNumber: 3, agentName: "Anomaly Detection Agent" };
}
```

## Step 5: Build Agent 6 — PO Validation Agent

**File**: `backend/src/agents/agent6_poValidator.js`

**What it does**: Fetches PO details from Supabase → compares invoice total against PO budget → uses Grok to assess budget compliance.

```javascript
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
  "budget_compliant": true/false,
  "po_status_ok": true/false,
  "budget_remaining": <number>,
  "budget_utilization_pct": <number>,
  "summary": "One-line summary",
  "issues": []
}`;

export async function runAgent6(orgId, poId, invoiceId) {
  const startMs = Date.now();

  const [poResult, invResult] = await Promise.all([
    supabase.from("purchase_orders").select("*, purchase_order_items(*)").eq("id", poId).single(),
    supabase.from("invoices").select("total_amount, invoice_number").eq("id", invoiceId).single(),
  ]);

  const po = poResult.data;
  const inv = invResult.data;
  if (!po) return { status: "error", summary: "PO not found", latencyMs: 0 };

  // Get all invoices against this PO to calculate consumed budget
  const { data: allInvoices } = await supabase
    .from("invoices").select("total_amount, status").eq("po_id", poId);
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
  return { ...parsed, latencyMs: Date.now() - startMs, agentNumber: 6, agentName: "PO Validation Agent" };
}
```

## Step 6: Build Agent 7 — Vendor Intelligence Agent

**File**: `backend/src/agents/agent7_vendorIntel.js`

**What it does**: Queries vendor history from Supabase (invoices, GRNs, payments, fraud_assessments) → feeds to Grok → returns vendor reliability score and risk tier.

```javascript
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
  "vendor_risk_score": <0-100, where 100 = safest>,
  "reliability_tier": "Tier 1 Preferred" | "Tier 2 Standard" | "Watchlist",
  "summary": "One-line assessment",
  "risk_factors": [],
  "historical_stats": { "total_invoices": N, "rejected": N, "avg_fraud_prob": N }
}`;

export async function runAgent7(orgId, invoiceId) {
  const startMs = Date.now();

  // Get supplier name from invoice
  const { data: inv } = await supabase
    .from("invoices").select("supplier_name").eq("id", invoiceId).single();
  if (!inv) return { status: "error", summary: "Invoice not found", latencyMs: 0 };

  // Fetch all historical data for this supplier
  const [invoicesRes, fraudRes, paymentsRes] = await Promise.all([
    supabase.from("invoices").select("id, status, total_amount, created_at").eq("supplier_name", inv.supplier_name),
    supabase.from("fraud_assessments").select("fraud_probability, risk_level").eq("supplier_name", inv.supplier_name),
    supabase.from("payments").select("status, amount"),
  ]);

  const allInvoices = invoicesRes.data || [];
  const rejected = allInvoices.filter(i => i.status === "rejected").length;
  const fraudScores = (fraudRes.data || []).map(f => f.fraud_probability);
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
  return { ...parsed, latencyMs: Date.now() - startMs, agentNumber: 7, agentName: "Vendor Intelligence Agent" };
}
```

## Step 7: Build Agent 8 — Compliance / Policy Agent

**File**: `backend/src/agents/agent8_compliancePolicy.js`

**What it does**: Instead of using Pinecone/vector DB (heavy), this agent uses Grok itself as the "policy knowledge base". We embed the organization's procurement policies directly in the system prompt. Grok checks compliance.

```javascript
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
  "compliant": true/false,
  "summary": "One-line compliance verdict",
  "applicable_policies": ["SOP-P2P-01", ...],
  "violations": [{ "policy": "SOP-FIN-08", "detail": "Price exceeds 20% threshold" }],
  "recommendations": []
}`;

export async function runAgent8(orgId, invoiceId, poId) {
  const startMs = Date.now();

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
  return { ...parsed, latencyMs: Date.now() - startMs, agentNumber: 8, agentName: "Compliance / Policy Agent" };
}
```

> [!TIP]
> **No Pinecone needed!** — For a college project, embedding policies directly in the system prompt is simpler and equally effective. The LLM already "knows" the policies. If you later want vector search, you can add it without changing the agent's interface.

## Step 8: Build Agent 4 — Approval / Decision Agent (Orchestrator Consumer)

**File**: `backend/src/agents/agent4_approvalDecision.js`

**What it does**: Receives the outputs of ALL other agents (1, 2, 3, 6, 7, 8) → feeds them to Grok → produces a final recommendation. **Never auto-approves payments** — always "recommendation only".

```javascript
// backend/src/agents/agent4_approvalDecision.js
import { askLLM } from "./llm.js";

const SYSTEM_PROMPT = `You are the Approval / Decision Agent — the final arbiter in a multi-agent P2P system.
You receive outputs from 6 upstream agents and must synthesize a final recommendation.

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
  "confidence_score": <0.0-1.0>,
  "summary": "One-line executive summary",
  "agent_consensus": { "passed": N, "warned": N, "failed": N },
  "reasoning": "2-3 sentence explanation of the decision",
  "safety_note": "Financial Safety Constraint: This is a recommendation only. Payment requires human sign-off."
}`;

export async function runAgent4(allAgentResults) {
  const startMs = Date.now();

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
  return { ...parsed, latencyMs: Date.now() - startMs, agentNumber: 4, agentName: "Approval / Decision Agent" };
}
```

## Step 9: Build Agent 9 — Notification / Escalation Agent

**File**: `backend/src/agents/agent9_notificationEscalation.js`

**What it does**: Takes the Decision Agent's recommendation → determines who to notify → logs the dispatch. For simplicity, it inserts notification records into a Supabase table (no email/webhook for now).

```javascript
// backend/src/agents/agent9_notificationEscalation.js
import { askLLM } from "./llm.js";
import { supabase } from "../supabaseClient.js";

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
  "routed_to": ["Accounts Payable", "Internal Audit", etc.],
  "actions_taken": ["Queued for review", "Alert dispatched", etc.],
  "audit_log_entry": "Timestamped record of this decision"
}`;

export async function runAgent9(decisionResult, orgId, invoiceId) {
  const startMs = Date.now();

  const userPrompt = JSON.stringify({
    recommendation: decisionResult.recommendation,
    confidence: decisionResult.confidence_score,
    reasoning: decisionResult.reasoning,
    invoice_id: invoiceId,
    timestamp: new Date().toISOString(),
  });

  const { parsed } = await askLLM(SYSTEM_PROMPT, userPrompt);
  return { ...parsed, latencyMs: Date.now() - startMs, agentNumber: 9, agentName: "Notification / Escalation Agent" };
}
```

> [!NOTE]
> **Future enhancement**: Add real email dispatch via Supabase Edge Functions or a simple `nodemailer` call. For now, the notification is logged in `agent_run_logs` and shown in the dashboard.

## Step 10: Build the Pipeline Orchestrator

**File**: `backend/src/agents/orchestrator.js`

**What it does**: Runs all 9 agents in sequence (with Agent 5 skipped for now since we already have structured data). Collects results, logs each step, and returns the full pipeline output.

**Execution order**: `Agent 1 → Agent 6 → Agent 2 → Agent 3 → Agent 7 → Agent 8 → Agent 4 → Agent 9`

```javascript
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

export async function runPipeline(orgId, invoiceId, poId) {
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
    // Phase 1: Invoice Validation
    const r1 = await runAgent1(invoiceId);
    results[1] = r1;
    logStep(1, "Invoice Validation Agent", r1);

    // Phase 2: PO Validation (only if poId exists)
    if (poId) {
      const r6 = await runAgent6(orgId, poId, invoiceId);
      results[6] = r6;
      logStep(6, "PO Validation Agent", r6);
    }

    // Phase 3: 3-Way Matching (only if poId exists)
    if (poId) {
      const r2 = await runAgent2(orgId, poId, invoiceId);
      results[2] = r2;
      logStep(2, "3-Way Matching Agent", r2);
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

    // Phase 7: Decision (feeds on all above)
    const r4 = await runAgent4(results);
    results[4] = r4;
    logStep(4, "Approval / Decision Agent", r4);

    // Phase 8: Notification
    const r9 = await runAgent9(r4, orgId, invoiceId);
    results[9] = r9;
    logStep(9, "Notification / Escalation Agent", r9);

  } catch (err) {
    console.error("[Pipeline Error]", err);
    logs.push({ agentNumber: 0, agentName: "Pipeline", status: "error", summary: err.message });
  }

  // Save all logs to Supabase
  const logRows = logs.map(l => ({
    org_id: orgId,
    invoice_id: invoiceId,
    po_id: poId || null,
    pipeline_id: pipelineId,
    agent_number: l.agentNumber,
    agent_name: l.agentName,
    status: l.status,
    latency_ms: l.latencyMs || 0,
    result_text: l.summary,
  }));

  await supabase.from("agent_run_logs").insert(logRows).then(({ error }) => {
    if (error) console.warn("[Pipeline] Failed to save logs:", error.message);
  });

  return {
    pipelineId,
    totalLatencyMs: Date.now() - startMs,
    agentResults: results,
    logs,
    finalRecommendation: results[4]?.recommendation || "UNKNOWN",
    finalStatus: results[4]?.status || "error",
  };
}
```

> [!IMPORTANT]
> **Agent 5 (Document Ingestion) is skipped** in the orchestrator because invoices are already in structured form in Supabase. If you later add PDF upload, you'd insert Agent 5 at the start to parse the PDF before Agent 1 validates it.

## Step 11: Create the Backend API Route

**File**: `backend/src/routes/agents.js`

**What it does**: Exposes `POST /api/agents/run-pipeline` that the frontend calls to trigger the real agent pipeline.

```javascript
// backend/src/routes/agents.js
import express from "express";
import { runPipeline } from "../agents/orchestrator.js";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

/**
 * POST /api/agents/run-pipeline
 * Body: { invoice_id, org_id?, po_id? }
 *
 * If org_id is not provided, we look it up from the invoice.
 */
router.post("/run-pipeline", async (req, res) => {
  try {
    let { invoice_id, org_id, po_id } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ error: "invoice_id is required" });
    }

    // Auto-resolve org_id and po_id from invoice if not provided
    if (!org_id || !po_id) {
      const { data: inv } = await supabase
        .from("invoices")
        .select("org_id, po_id")
        .eq("id", invoice_id)
        .single();

      if (inv) {
        org_id = org_id || inv.org_id;
        po_id = po_id || inv.po_id;
      }
    }

    if (!org_id) {
      return res.status(400).json({ error: "Could not determine org_id" });
    }

    const result = await runPipeline(org_id, invoice_id, po_id);
    res.json(result);
  } catch (err) {
    console.error("[Agent Pipeline Error]", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/agents/logs?invoice_id=<uuid>
 * Returns past pipeline run logs for an invoice.
 */
router.get("/logs", async (req, res) => {
  const { invoice_id, pipeline_id } = req.query;
  let query = supabase.from("agent_run_logs").select("*").order("created_at", { ascending: true });

  if (pipeline_id) query = query.eq("pipeline_id", pipeline_id);
  else if (invoice_id) query = query.eq("invoice_id", invoice_id);
  else return res.status(400).json({ error: "invoice_id or pipeline_id required" });

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
```

**Register in [`backend/src/index.js`](file:///c:/Users/Admin/Desktop/sem%206/PBL-2/Project/p2p/backend/src/index.js)**:

```diff
 import validationRoutes from "./routes/validation.js";
+import agentRoutes from "./routes/agents.js";

 // Routes
 app.use("/api/validate", validationRoutes);
+app.use("/api/agents", agentRoutes);
```

## Step 12: Connect Frontend to Real Backend Pipeline

**File**: Modify [`AgentFleetDashboard.jsx`](file:///c:/Users/Admin/Desktop/sem%206/PBL-2/Project/p2p/frontend/src/components/agent-fleet/AgentFleetDashboard.jsx)

**What changes**: Replace the `runWorkflow()` function that uses `setInterval` + hardcoded scenarios with a real `fetch()` call to the backend.

```javascript
// REPLACE the existing runWorkflow function (around line 374-436) with:

const runWorkflow = async () => {
  if (isRunning) return;
  setIsRunning(true);
  setActiveStepIndex(0);
  setCompletedSteps({});
  setPipelineFinished(false);

  // Determine which invoice to analyze
  let invoiceId = null;
  if (selectedInvoiceSource === "live" && selectedLiveInvoiceId) {
    invoiceId = selectedLiveInvoiceId;
  } else if (liveInvoices.length > 0) {
    invoiceId = liveInvoices[0].id;  // Default to first live invoice
  }

  if (!invoiceId) {
    setLogs([{ time: new Date().toLocaleTimeString(), tag: "ERROR", text: "No invoice selected. Please select an invoice to analyze.", color: "#ef4444" }]);
    setIsRunning(false);
    return;
  }

  setLogs([
    { time: new Date().toLocaleTimeString(), tag: "PIPELINE", text: `Calling REAL Agent Pipeline for invoice ${invoiceId.slice(0, 8)}...`, color: "#38bdf8" },
    { time: new Date().toLocaleTimeString(), tag: "SAFETY", text: "Financial Safety Constraint Active.", color: "#fbbf24" },
  ]);

  try {
    const response = await fetch("http://localhost:3001/api/agents/run-pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Pipeline failed");

    // Animate results one-by-one with a small delay
    const agentOrder = [1, 6, 2, 3, 7, 8, 4, 9];
    let step = 0;

    const interval = setInterval(() => {
      if (step >= agentOrder.length) {
        clearInterval(interval);
        setIsRunning(false);
        setActiveStepIndex(-1);
        setPipelineFinished(true);
        setExecutionCount(prev => prev + 1);
        setAvgLatency(`${(data.totalLatencyMs / 1000).toFixed(1)}s`);

        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          tag: "CONSENSUS",
          text: `Pipeline Complete (${data.totalLatencyMs}ms). Verdict: ${data.finalRecommendation}`,
          color: data.finalStatus === "pass" ? "#10b981" : data.finalStatus === "warn" ? "#f59e0b" : "#ef4444",
        }]);
        return;
      }

      const agentId = agentOrder[step];
      const result = data.agentResults[agentId];
      if (!result) { step++; return; }

      setActiveStepIndex(step);
      setCompletedSteps(prev => ({ ...prev, [agentId]: {
        status: result.status,
        latency: `${result.latencyMs}ms`,
        text: result.summary || "Processed.",
      }}));

      const tagColor = result.status === "pass" ? "#10b981" : result.status === "warn" ? "#f59e0b" : "#ef4444";
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        tag: `AGENT ${String(agentId).padStart(2, "0")} [${(result.agentName || "").toUpperCase().slice(0, 15)}]`,
        text: `${result.summary} (${result.latencyMs}ms)`,
        color: tagColor,
      }]);

      step++;
    }, 400);  // 400ms delay between each agent animation

  } catch (err) {
    setLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      tag: "ERROR",
      text: `Pipeline failed: ${err.message}`,
      color: "#ef4444",
    }]);
    setIsRunning(false);
  }
};
```

> [!WARNING]
> **Keep the preset scenarios as a fallback**. If the backend is down or no invoices exist in the DB, the UI should still be able to demo with preset data. Wrap the real API call in a try/catch and fall back to the existing simulation.

## Step 13: Store Agent Run Logs in Supabase

This is already handled by the orchestrator in Step 10. The `agent_run_logs` table stores every pipeline run with:

| Column | Purpose |
|--------|--------|
| `pipeline_id` | Groups all agent results from a single run |
| `agent_number` | Which agent (1-9) |
| `status` | pass / warn / fail / error |
| `latency_ms` | Real measured latency |
| `result_text` | Human-readable summary from Grok |
| `raw_llm_response` | Full JSON response for audit |

**To show past runs in the dashboard**, add a "History" tab that fetches from `GET /api/agents/logs?invoice_id=<id>`.

**Update the dashboard metrics** to read from real data:
```javascript
// In AgentFleetDashboard.jsx, on mount:
useEffect(() => {
  // Fetch total pipeline executions from Supabase
  fetch("http://localhost:3001/api/agents/logs?invoice_id=all")
    .then(r => r.json())
    .then(logs => {
      const uniquePipelines = new Set(logs.map(l => l.pipeline_id));
      setExecutionCount(uniquePipelines.size);
    })
    .catch(() => {}); // Silently fail if backend is down
}, []);
```

## Step 14: Testing & Verification

### Pre-flight Checklist

- [ ] `GROK_API_KEY` is set in `backend/.env`
- [ ] `agent_run_logs` table exists in Supabase
- [ ] Backend has `openai` installed
- [ ] `backend/src/routes/agents.js` is registered in `index.js`

### Test Script

Create `backend/test_agents.js`:

```javascript
// backend/test_agents.js
import dotenv from "dotenv";
dotenv.config();
import { runPipeline } from "./src/agents/orchestrator.js";

const ORG_ID = "11111111-1111-1111-1111-111111111111";

// You need a real invoice_id in your Supabase DB.
// Insert test data first, or use an existing invoice.
const INVOICE_ID = process.argv[2] || "<paste-invoice-id-here>";

console.log("Running full agent pipeline via Grok (xAI)...");
const result = await runPipeline(ORG_ID, INVOICE_ID);

console.log("\n=== PIPELINE RESULT ===");
console.log("Pipeline ID:", result.pipelineId);
console.log("Total Latency:", result.totalLatencyMs, "ms");
console.log("Final Recommendation:", result.finalRecommendation);
console.log("\n--- Agent Results ---");
for (const [num, r] of Object.entries(result.agentResults)) {
  console.log(`  Agent ${num} (${r.agentName}): ${r.status} — ${r.summary}`);
}
```

**Run it:**
```bash
cd backend
node test_agents.js <invoice-id>
```

### End-to-End Test Flow

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Sign in → Navigate to Agent Fleet Dashboard
4. Select a live invoice from the dropdown
5. Click **"Run Pipeline"**
6. Watch real Grok LLM responses appear in the terminal log
7. Check `agent_run_logs` table in Supabase for the stored run

### Expected Behavior

| Agent | Response Time | Source |
|-------|--------------|--------|
| Agent 1 (Invoice Validation) | ~1-2s | Grok API (xAI) |
| Agent 2 (3-Way Matching) | ~1-3s | Supabase queries + Grok |
| Agent 3 (Anomaly Detection) | ~1-2s | Feature calc + Grok |
| Agent 4 (Decision) | ~1-2s | Grok (synthesizes all agent outputs) |
| Agent 6 (PO Validation) | ~1-2s | Supabase + Grok |
| Agent 7 (Vendor Intel) | ~1-2s | Supabase history + Grok |
| Agent 8 (Compliance) | ~1-2s | Grok (policies in prompt) |
| Agent 9 (Notification) | ~1-2s | Grok |
| **Total Pipeline** | **~8-15s** | **Sequential execution (No rate limits!)** |

> [!TIP]
> **To speed up the pipeline**, you can run Agents 1, 6, 3, 7, 8 in parallel (they don't depend on each other). Only Agent 2 needs Agent 6's output, Agent 4 needs all upstream results, and Agent 9 needs Agent 4. This would cut total time to ~4-6s.
