-- Add expected_vacate_date to support_requests table
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS expected_vacate_date DATE;

-- Add vacate_date to seats table if missing
ALTER TABLE public.seats ADD COLUMN IF NOT EXISTS vacate_date TIMESTAMP WITH TIME ZONE;

-- Add vacate_notice_at to clients table if missing
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS vacate_notice_at TIMESTAMP WITH TIME ZONE;
