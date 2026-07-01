-- Migration to create the company_timeline table
-- Created at: 2026-07-01 13:00:00

CREATE TABLE IF NOT EXISTS public.company_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    heading TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.company_timeline ENABLE ROW LEVEL SECURITY;

-- Select/Insert/Update/Delete policy: admin only
DROP POLICY IF EXISTS "company_timeline_admin_all" ON public.company_timeline;
CREATE POLICY "company_timeline_admin_all" ON public.company_timeline
    FOR ALL TO authenticated USING (public.get_user_role() = 'admin'::public.user_role);

-- Create index for sorting milestones chronologically
CREATE INDEX IF NOT EXISTS idx_company_timeline_date ON public.company_timeline(date ASC);
