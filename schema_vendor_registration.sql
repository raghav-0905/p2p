-- Optional columns for verified vendor registration (run in Supabase SQL if missing)
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS registration_status text DEFAULT 'pending_verification',
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz;

COMMENT ON COLUMN public.vendors.registration_status IS 'pending_verification | verified | rejected';
