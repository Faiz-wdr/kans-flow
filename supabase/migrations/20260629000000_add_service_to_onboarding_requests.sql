-- Add service column to onboarding_requests table with default 'Coworking'
ALTER TABLE public.onboarding_requests 
ADD COLUMN IF NOT EXISTS service TEXT DEFAULT 'Coworking';

-- Index for service filtering
CREATE INDEX IF NOT EXISTS idx_onboarding_requests_service ON public.onboarding_requests(service);
