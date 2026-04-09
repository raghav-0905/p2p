-- Add invoice_id to grns table to support direct linkage
ALTER TABLE public.grns
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id);

COMMENT ON COLUMN public.grns.invoice_id IS 'Links this GRN to the specific vendor invoice being fulfilled';
