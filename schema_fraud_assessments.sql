-- ============================================================
-- SCHEMA: Fraud Assessments Table + Vendor Risk Score Column
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add risk_score column to vendors table
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS risk_score FLOAT DEFAULT NULL;

COMMENT ON COLUMN public.vendors.risk_score IS 'Aggregated fraud risk score (0-1) from ML model, updated weekly';

-- 2. Create fraud_assessments table
CREATE TABLE IF NOT EXISTS public.fraud_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES public.organizations(id) NOT NULL,
    invoice_id UUID REFERENCES public.invoices(id) NOT NULL,
    po_id UUID,
    grn_id UUID,

    -- ML scoring results
    fraud_probability FLOAT NOT NULL DEFAULT 0,
    is_fraud BOOLEAN NOT NULL DEFAULT false,
    risk_level TEXT NOT NULL DEFAULT 'low',

    -- SHAP feature contributions
    feature_contributions JSONB DEFAULT '{}'::jsonb,

    -- 3-way match results
    match_status TEXT DEFAULT 'pending',
    match_details JSONB DEFAULT '{}'::jsonb,

    -- Context
    supplier_name TEXT,
    invoice_amount FLOAT,
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    model_version TEXT DEFAULT 'xgboost_v1',

    UNIQUE(invoice_id)
);

COMMENT ON TABLE public.fraud_assessments IS 'Per-invoice ML fraud scoring results with SHAP feature contributions and 3-way match status';
COMMENT ON COLUMN public.fraud_assessments.risk_level IS 'low | medium | high | critical';
COMMENT ON COLUMN public.fraud_assessments.match_status IS 'matched | mismatch | partial | pending';
COMMENT ON COLUMN public.fraud_assessments.feature_contributions IS 'JSON: { feature_name: shap_contribution_value }';
COMMENT ON COLUMN public.fraud_assessments.match_details IS 'JSON: { qty_match, amount_match, amount_diff, mismatched_items[] }';

-- 3. Enable RLS
ALTER TABLE public.fraud_assessments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Org users can view fraud assessments for their organization
CREATE POLICY "Org users can view fraud assessments"
ON public.fraud_assessments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_users ou
        WHERE ou.org_id = public.fraud_assessments.org_id
          AND ou.user_id = auth.uid()
    )
);

-- Note: The Node.js backend uses the service_role key which bypasses RLS.
-- No INSERT/UPDATE policies are needed for authenticated users since only the backend writes.
