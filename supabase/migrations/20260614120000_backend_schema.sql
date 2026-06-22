-- =============================================================================
-- ENUMS DEFINITION
-- =============================================================================
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.seat_type AS ENUM ('coworking', 'study', 'cabin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.seat_status AS ENUM ('available', 'occupied', 'vacating');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.client_status AS ENUM ('onboarding', 'active', 'vacating', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.onboarding_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.support_category AS ENUM ('wifi', 'cleaning', 'billing', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.support_status AS ENUM ('open', 'in_progress', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.vacate_status AS ENUM ('pending', 'verified', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.notification_type AS ENUM ('new_onboarding', 'new_ticket', 'vacate_notice', 'announcement');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- =============================================================================
-- 1. ORGANIZATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 2. STAFF PROFILES (Linked to auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL,
    role public.user_role DEFAULT 'staff'::public.user_role NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 3. WORKSPACE ZONES (Floors / Sections)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.workspace_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    floor_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.workspace_zones ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 4. SEAT LAYOUTS (Visual floor layouts metadata)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.seat_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES public.workspace_zones(id) ON DELETE CASCADE,
    background_image_url TEXT,
    dimensions JSONB DEFAULT '{"width": 800, "height": 600}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.seat_layouts ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 5. SEATS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES public.workspace_zones(id) ON DELETE RESTRICT,
    layout_id UUID REFERENCES public.seat_layouts(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type public.seat_type NOT NULL,
    status public.seat_status DEFAULT 'available'::public.seat_status NOT NULL,
    coordinates JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 6. CLIENTS (Main client directory)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    status public.client_status DEFAULT 'onboarding'::public.client_status NOT NULL,
    onboarded_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 7. CLIENT DOCUMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.client_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 8. SEAT ASSIGNMENTS (History and active lease mappings)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.seat_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    seat_id UUID NOT NULL REFERENCES public.seats(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.seat_assignments ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 9. ONBOARDING REQUESTS (Membership application intake)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.onboarding_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    seat_preference public.seat_type NOT NULL,
    start_date DATE NOT NULL,
    notes TEXT,
    status public.onboarding_status DEFAULT 'pending'::public.onboarding_status NOT NULL,
    reviewed_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.onboarding_requests ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 10. SUPPORT REQUESTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.support_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    seat_number TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    category public.support_category NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status public.support_status DEFAULT 'open'::public.support_status NOT NULL,
    assigned_to UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 11. SUPPORT NOTES (Internal Thread)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.support_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.support_notes ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 12. VACATE REQUESTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.vacate_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    seat_id UUID NOT NULL REFERENCES public.seats(id) ON DELETE RESTRICT,
    notice_date DATE NOT NULL,
    expected_vacate_date DATE NOT NULL,
    status public.vacate_status DEFAULT 'pending'::public.vacate_status NOT NULL,
    checklist_key_returned BOOLEAN DEFAULT false NOT NULL,
    checklist_dues_cleared BOOLEAN DEFAULT false NOT NULL,
    checklist_desk_inspected BOOLEAN DEFAULT false NOT NULL,
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.vacate_requests ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 13. ANNOUNCEMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    published_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 14. NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    target_role public.user_role,
    target_user_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 15. ACTIVITY LOGS (Audit logs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;


--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY POLICIES
--------------------------------------------------------------------------------

-- Staff profiles check helpers
CREATE OR REPLACE FUNCTION public.get_user_org()
RETURNS UUID AS $$
    SELECT organization_id FROM public.staff_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
    SELECT role FROM public.staff_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Organizations Policies
CREATE POLICY "org_select_policy" ON public.organizations
    FOR SELECT USING (id = public.get_user_org());

-- 2. Staff Profiles Policies
CREATE POLICY "profiles_select_policy" ON public.staff_profiles
    FOR SELECT USING (organization_id = public.get_user_org());

CREATE POLICY "profiles_update_self" ON public.staff_profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_write_policy" ON public.staff_profiles
    FOR ALL USING (organization_id = public.get_user_org() AND public.get_user_role() = 'admin'::public.user_role);

-- 3. Workspace Zones Policies
CREATE POLICY "zones_select_policy" ON public.workspace_zones
    FOR SELECT USING (organization_id = public.get_user_org());

CREATE POLICY "zones_write_policy" ON public.workspace_zones
    FOR ALL USING (organization_id = public.get_user_org() AND public.get_user_role() = 'admin'::public.user_role);

-- 4. Seat Layouts Policies
CREATE POLICY "layouts_select_policy" ON public.seat_layouts
    FOR SELECT USING (organization_id = public.get_user_org());

CREATE POLICY "layouts_write_policy" ON public.seat_layouts
    FOR ALL USING (organization_id = public.get_user_org() AND public.get_user_role() = 'admin'::public.user_role);

-- 5. Seats Policies
CREATE POLICY "seats_select_policy" ON public.seats
    FOR SELECT USING (organization_id = public.get_user_org());

CREATE POLICY "seats_write_policy" ON public.seats
    FOR ALL USING (organization_id = public.get_user_org() AND public.get_user_role() = 'admin'::public.user_role);

-- 6. Clients Policies
CREATE POLICY "clients_select_policy" ON public.clients
    FOR SELECT USING (organization_id = public.get_user_org());

CREATE POLICY "clients_write_policy" ON public.clients
    FOR ALL USING (organization_id = public.get_user_org());

-- 7. Client Documents Policies
CREATE POLICY "docs_select_policy" ON public.client_documents
    FOR SELECT USING (organization_id = public.get_user_org());

CREATE POLICY "docs_write_policy" ON public.client_documents
    FOR ALL USING (organization_id = public.get_user_org());

-- 8. Seat Assignments Policies
CREATE POLICY "assignments_select_policy" ON public.seat_assignments
    FOR SELECT USING (organization_id = public.get_user_org());

CREATE POLICY "assignments_write_policy" ON public.seat_assignments
    FOR ALL USING (organization_id = public.get_user_org());

-- 9. Onboarding Requests Policies
CREATE POLICY "onboarding_insert_public" ON public.onboarding_requests
    FOR INSERT WITH CHECK (true); -- Public forms submission

CREATE POLICY "onboarding_select_policy" ON public.onboarding_requests
    FOR SELECT USING (organization_id = public.get_user_org() OR organization_id IS NULL);

CREATE POLICY "onboarding_write_policy" ON public.onboarding_requests
    FOR ALL USING (organization_id = public.get_user_org() OR organization_id IS NULL);

-- 10. Support Requests Policies
CREATE POLICY "support_insert_public" ON public.support_requests
    FOR INSERT WITH CHECK (true); -- Public support submission

CREATE POLICY "support_select_policy" ON public.support_requests
    FOR SELECT USING (organization_id = public.get_user_org() OR organization_id IS NULL);

CREATE POLICY "support_write_policy" ON public.support_requests
    FOR ALL USING (organization_id = public.get_user_org() OR organization_id IS NULL);

-- 11. Support Notes Policies
CREATE POLICY "notes_select_policy" ON public.support_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.support_requests r
            WHERE r.id = request_id AND (r.organization_id = public.get_user_org() OR r.organization_id IS NULL)
        )
    );

CREATE POLICY "notes_insert_policy" ON public.support_notes
    FOR INSERT WITH CHECK (
        author_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.support_requests r
            WHERE r.id = request_id AND (r.organization_id = public.get_user_org() OR r.organization_id IS NULL)
        )
    );

-- 12. Vacate Requests Policies
CREATE POLICY "vacate_select_policy" ON public.vacate_requests
    FOR SELECT USING (organization_id = public.get_user_org());

CREATE POLICY "vacate_write_policy" ON public.vacate_requests
    FOR ALL USING (organization_id = public.get_user_org());

-- 13. Announcements Policies
CREATE POLICY "announcements_select_policy" ON public.announcements
    FOR SELECT USING (organization_id = public.get_user_org());

CREATE POLICY "announcements_write_policy" ON public.announcements
    FOR ALL USING (organization_id = public.get_user_org() AND public.get_user_role() = 'admin'::public.user_role);

-- 14. Notifications Policies
CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT USING (
        organization_id = public.get_user_org() AND (
            target_user_id = auth.uid() OR 
            target_role = public.get_user_role() OR 
            (target_user_id IS NULL AND target_role IS NULL)
        )
    );

CREATE POLICY "notifications_update_policy" ON public.notifications
    FOR UPDATE USING (organization_id = public.get_user_org()) WITH CHECK (is_read = true);

-- 15. Activity Logs Policies
CREATE POLICY "logs_select_policy" ON public.activity_logs
    FOR SELECT USING (organization_id = public.get_user_org());


--------------------------------------------------------------------------------
-- DATABASE TRIGGERS
--------------------------------------------------------------------------------

-- Custom claims sync function for auth JWT mapping
CREATE OR REPLACE FUNCTION public.handle_auth_metadata_sync()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || 
        jsonb_build_object(
            'role', new.role,
            'organization_id', new.organization_id
        )
    WHERE id = new.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for staff metadata updates
DROP TRIGGER IF EXISTS on_staff_profile_updated ON public.staff_profiles;
CREATE TRIGGER on_staff_profile_updated
    AFTER INSERT OR UPDATE ON public.staff_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_metadata_sync();


--------------------------------------------------------------------------------
-- RECENT INDEXES SETUP
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_staff_profiles_org ON public.staff_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_workspace_zones_org ON public.workspace_zones(organization_id);
CREATE INDEX IF NOT EXISTS idx_seat_layouts_zone ON public.seat_layouts(zone_id);
CREATE INDEX IF NOT EXISTS idx_seats_org_zone ON public.seats(organization_id, zone_id);
CREATE INDEX IF NOT EXISTS idx_seats_status ON public.seats(status);
CREATE INDEX IF NOT EXISTS idx_clients_org_status ON public.clients(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_client_documents_client ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_seat_assignments_active ON public.seat_assignments(client_id, seat_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_onboarding_requests_status ON public.onboarding_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON public.support_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_support_notes_request ON public.support_notes(request_id);
CREATE INDEX IF NOT EXISTS idx_vacate_requests_date ON public.vacate_requests(expected_vacate_date, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(target_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org ON public.activity_logs(organization_id, created_at DESC);
