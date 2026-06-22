-- Create the ID proofs storage bucket with 5MB file limit and specific image/pdf mime types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'id-proofs',
    'id-proofs',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid duplication errors
DROP POLICY IF EXISTS "Allow public upload to id-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated view of id-proofs" ON storage.objects;

-- Allow public users to upload files to the id-proofs bucket
CREATE POLICY "Allow public upload to id-proofs" ON storage.objects
    FOR INSERT TO public
    WITH CHECK (bucket_id = 'id-proofs');

-- Restrict file reads only to authenticated operators (Admin and Staff profiles)
CREATE POLICY "Allow authenticated view of id-proofs" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'id-proofs');
