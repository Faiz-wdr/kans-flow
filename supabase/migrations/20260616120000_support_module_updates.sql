-- 1. Alter existing columns in support_requests from enums to TEXT to prevent locks
ALTER TABLE public.support_requests ALTER COLUMN category TYPE TEXT;
ALTER TABLE public.support_requests ALTER COLUMN status TYPE TEXT;
ALTER TABLE public.support_requests ALTER COLUMN status SET DEFAULT 'open';

-- 2. Create ticket number sequence
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_number_seq START WITH 1;

-- 3. Add columns to support_requests table
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS ticket_number TEXT DEFAULT ('#' || lpad(nextval('public.support_ticket_number_seq')::text, 4, '0'));
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- 4. Set up storage bucket support-attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'support-attachments',
    'support-attachments',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for public upload and view of support attachments
DROP POLICY IF EXISTS "Allow public upload to support-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public view of support-attachments" ON storage.objects;

CREATE POLICY "Allow public upload to support-attachments" ON storage.objects
    FOR INSERT TO public
    WITH CHECK (bucket_id = 'support-attachments');

CREATE POLICY "Allow public view of support-attachments" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'support-attachments');
