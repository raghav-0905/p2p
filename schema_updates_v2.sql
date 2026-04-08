-- SQL snippet to update schema for Line Items and Multi-Org Vendor connections

-- 1. Add line_items column to purchase_orders
ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb;

-- 2. Create the vendor_organizations bridging table 
CREATE TABLE IF NOT EXISTS public.vendor_organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_user_id UUID REFERENCES auth.users(id) NOT NULL,
    org_id UUID REFERENCES public.organizations(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(vendor_user_id, org_id) -- Prevent duplicate linkages
);

-- Note: In the future, the 'org_id' in public.vendors can become optional or deprecated
-- since vendors will route through the vendor_organizations table for their multi-org mapping.

-- Turn on row level security for the new bridging table
ALTER TABLE public.vendor_organizations ENABLE ROW LEVEL SECURITY;

-- Allow vendors to manage their own organization links
CREATE POLICY "Vendors can view their linked orgs" ON public.vendor_organizations
    FOR SELECT USING (auth.uid() = vendor_user_id);

CREATE POLICY "Vendors can link to new orgs" ON public.vendor_organizations
    FOR INSERT WITH CHECK (auth.uid() = vendor_user_id);
    
-- Ensure organizations can read this table if necessary
CREATE POLICY "Orgs can see connected vendors" ON public.vendor_organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.org_id = public.vendor_organizations.org_id AND ou.user_id = auth.uid()
        )
    );
