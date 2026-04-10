-- Fix: Allow vendors (authenticated users) to read line items for POs, GRNs, and Invoices
-- The parent tables (purchase_orders, invoices, grns) already implement vendor/org RLS.
-- This allows line items to be fetched correctly in the Vendor Dashboard.

-- 1. Purchase Order Items
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for authenticated on purchase_order_items" ON public.purchase_order_items;

CREATE POLICY "Enable read for authenticated on purchase_order_items" 
  ON public.purchase_order_items 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- 2. Invoice Items
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for authenticated on invoice_items" ON public.invoice_items;

CREATE POLICY "Enable read for authenticated on invoice_items" 
  ON public.invoice_items 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- 3. GRN Items (Ensure both old and new policy names are replaced cleanly)
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for authenticated on grn_items" ON public.grn_items;
DROP POLICY IF EXISTS "Enable read for authenticated users on grn_items" ON public.grn_items;

CREATE POLICY "Enable read for authenticated on grn_items" 
  ON public.grn_items 
  FOR SELECT 
  TO authenticated 
  USING (true);
