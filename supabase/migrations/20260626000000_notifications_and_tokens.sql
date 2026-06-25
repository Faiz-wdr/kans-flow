-- Create fcm_tokens table
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for fcm_tokens
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for fcm_tokens
CREATE POLICY "Allow authenticated users to read fcm tokens" ON public.fcm_tokens
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to manage their own tokens" ON public.fcm_tokens
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Alter notifications table to support metadata and deep links
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_module TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS rich_type TEXT;
