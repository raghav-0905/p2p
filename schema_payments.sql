-- SQL snippet to create the payments table

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_due_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    status VARCHAR(50) DEFAULT 'paid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on row level security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow reading payments
CREATE POLICY "Allow read payments" ON public.payments
    FOR SELECT USING (true);

-- Allow inserting payments
CREATE POLICY "Allow insert payments" ON public.payments
    FOR INSERT WITH CHECK (true);

-- Allow updating payments
CREATE POLICY "Allow update payments" ON public.payments
    FOR UPDATE USING (true);
