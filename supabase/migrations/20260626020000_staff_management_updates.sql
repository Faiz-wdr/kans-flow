-- Create sequence for auto-generating employee IDs
CREATE SEQUENCE IF NOT EXISTS public.employee_id_seq START 1;

-- 1. Add fields to public.staff_profiles
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS employee_id TEXT DEFAULT ('KF-' || lpad(nextval('public.employee_id_seq')::text, 4, '0'));
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false NOT NULL;

-- 2. Create sectors table
CREATE TABLE IF NOT EXISTS public.sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for sectors
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

-- Select policy: authenticated users can read
DROP POLICY IF EXISTS "sectors_select_policy" ON public.sectors;
CREATE POLICY "sectors_select_policy" ON public.sectors
    FOR SELECT USING (auth.role() = 'authenticated');

-- Write policy: admin only
DROP POLICY IF EXISTS "sectors_write_policy" ON public.sectors;
CREATE POLICY "sectors_write_policy" ON public.sectors
    FOR ALL USING (public.get_user_role() = 'admin'::public.user_role);

-- Seed initial sectors
INSERT INTO public.sectors (name, slug) VALUES
    ('Coworking Space', 'coworking-space'),
    ('Study Space', 'study-space'),
    ('Virtual Office', 'virtual-office'),
    ('Business Consulting', 'business-consulting'),
    ('Online Academy', 'online-academy')
ON CONFLICT (slug) DO NOTHING;

-- 3. Create staff_sectors join table
CREATE TABLE IF NOT EXISTS public.staff_sectors (
    staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    sector_id UUID REFERENCES public.sectors(id) ON DELETE CASCADE,
    PRIMARY KEY (staff_id, sector_id)
);

-- Enable RLS for staff_sectors
ALTER TABLE public.staff_sectors ENABLE ROW LEVEL SECURITY;

-- Select policy: authenticated users can read
DROP POLICY IF EXISTS "staff_sectors_select_policy" ON public.staff_sectors;
CREATE POLICY "staff_sectors_select_policy" ON public.staff_sectors
    FOR SELECT USING (auth.role() = 'authenticated');

-- Write policy: admin only
DROP POLICY IF EXISTS "staff_sectors_write_policy" ON public.staff_sectors;
CREATE POLICY "staff_sectors_write_policy" ON public.staff_sectors
    FOR ALL USING (public.get_user_role() = 'admin'::public.user_role);

-- 4. Update the handle_new_user function to sync email, role, full_name, and custom properties
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;

    INSERT INTO public.staff_profiles (id, organization_id, full_name, email, role, is_active, is_deleted)
    VALUES (
        new.id,
        default_org_id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'New Staff Member'),
        new.email,
        COALESCE(new.raw_user_meta_data->>'role', 'staff')::public.user_role,
        TRUE,
        FALSE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Backfill existing profile emails from auth.users
UPDATE public.staff_profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;
