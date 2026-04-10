import express from "express";
import { perform3WayMatch, validatePOPaymentClosure } from "../services/matchingService.js";
import { scoreInvoice } from "../services/scoringService.js";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

/**
 * Triggered after GRN creation
 * Performs 3-way match
 */
router.post("/grn-match", async (req, res) => {
  const { org_id, po_id, grn_id, invoice_id } = req.body;
  if (!org_id || !po_id || !grn_id) {
    return res.status(400).json({ error: "org_id, po_id, and grn_id required" });
  }

  const result = await perform3WayMatch(org_id, po_id, grn_id, invoice_id);
  
  // Trigger ML Scoring automatically if invoice is present
  if (invoice_id) {
    try {
      await scoreInvoice(org_id, invoice_id);
    } catch (e) {
      console.warn("ML Scoring failed (Flask API might be down):", e.message);
    }
  }
  
  if (!result.success) return res.status(500).json(result);
  res.json(result);
});

/**
 * Triggered to score an invoice
 */
router.post("/score-invoice", async (req, res) => {
  const { org_id, invoice_id } = req.body;
  if (!org_id || !invoice_id) {
    return res.status(400).json({ error: "org_id and invoice_id required" });
  }

  // Score the invoice
  const scoreResult = await scoreInvoice(org_id, invoice_id);
  
  // Try matching as well if possible
  const { data: inv } = await supabase.from("invoices").select("po_id").eq("id", invoice_id).single();
  if (inv && inv.po_id) {
     await perform3WayMatch(org_id, inv.po_id, null, invoice_id);
  }

  if (!scoreResult.success) return res.status(500).json(scoreResult);
  res.json(scoreResult);
});

/**
 * Batch update vendor scores (e.g. weekly cron)
 */
router.post("/score-vendors", async (req, res) => {
  try {
    // 1. Get all vendors
    const { data: vendors } = await supabase.from("vendors").select("id, company_name");
    
    // 2. For each vendor, find all their fraud assessments via supplier name
    for (const vendor of vendors) {
       const { data: assessments } = await supabase
         .from("fraud_assessments")
         .select("fraud_probability")
         .eq("supplier_name", vendor.company_name);

       if (assessments && assessments.length > 0) {
           const avgScore = assessments.reduce((acc, curr) => acc + curr.fraud_probability, 0) / assessments.length;
           
           await supabase
             .from("vendors")
             .update({ risk_score: avgScore })
             .eq("id", vendor.id);
       }
    }
    
    res.json({ success: true, message: "Vendor risk scores updated." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get assessments for dashboard
 */
router.get("/assessments/:orgId", async (req, res) => {
  const { orgId } = req.params;
  
  // Optionally verify token if we added auth middleware, but we'll trust orgId for now
  const { data, error } = await supabase
    .from("fraud_assessments")
    .select("*")
    .eq("org_id", orgId)
    .order("assessed_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

/**
 * Validates if a PO can be closed based on payments
 */
router.post("/validate-po-closure", async (req, res) => {
  const { po_id } = req.body;
  if (!po_id) {
    return res.status(400).json({ error: "po_id is required" });
  }

  const result = await validatePOPaymentClosure(po_id);
  
  if (!result.success) return res.status(500).json(result);
  res.json(result);
});

export default router;
