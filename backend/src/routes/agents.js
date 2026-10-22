// backend/src/routes/agents.js
import express from "express";
import { runPipeline } from "../agents/orchestrator.js";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

/**
 * POST /api/agents/run-pipeline
 * Body: { invoice_id, org_id?, po_id? }
 */
router.post("/run-pipeline", async (req, res) => {
  try {
    let { invoice_id, org_id, po_id } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ error: "invoice_id is required" });
    }

    // Auto-resolve org_id and po_id from invoice if missing
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

    const result = await runPipeline(org_id, invoice_id, po_id);
    return res.json(result);
  } catch (err) {
    console.error("[Agent Route Error]", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/agents/logs?invoice_id=<uuid>&pipeline_id=<uuid>
 */
router.get("/logs", async (req, res) => {
  try {
    const { invoice_id, pipeline_id } = req.query;
    let query = supabase.from("agent_run_logs").select("*").order("created_at", { ascending: true });

    if (pipeline_id) {
      query = query.eq("pipeline_id", pipeline_id);
    } else if (invoice_id && invoice_id !== "all") {
      query = query.eq("invoice_id", invoice_id);
    }

    const { data, error } = await query;
    if (error) {
      return res.json([]); // Graceful fallback if table doesn't exist yet
    }
    return res.json(data || []);
  } catch (err) {
    return res.json([]);
  }
});

export default router;
