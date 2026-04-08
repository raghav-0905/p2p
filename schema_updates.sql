-- SQL snippet to create a vendors table in Supabase

-- Create the vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    org_id UUID REFERENCES public.organizations(id) NOT NULL, -- Target organization they supply
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on row level security
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view only their vendor profiles
CREATE POLICY "Vendors can view their own profile" ON public.vendors
    FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their vendor profile during registration
CREATE POLICY "Vendors can insert their own profile" ON public.vendors
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own profile
CREATE POLICY "Vendors can update their own profile" ON public.vendors
    FOR UPDATE USING (auth.uid() = user_id);

-- (Optional) If internal org users need to query their vendors
CREATE POLICY "Org users can view their vendors" ON public.vendors
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.org_id = public.vendors.org_id AND ou.user_id = auth.uid()
        )
    );
