-- Create UUID extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable RLS for organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'staff')) DEFAULT 'staff' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT CHECK (status IN ('onboarding', 'active', 'vacating', 'archived')) DEFAULT 'onboarding' NOT NULL,
    seat_id UUID, -- Foreign key to seats is added later to avoid circular reference
    onboarded_at TIMESTAMP WITH TIME ZONE,
    vacate_notice_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable RLS for clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 4. Seats table
CREATE TABLE IF NOT EXISTS public.seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('coworking', 'study', 'cabin')) NOT NULL,
    status TEXT CHECK (status IN ('available', 'occupied', 'vacating')) DEFAULT 'available' NOT NULL,
    coordinates JSONB DEFAULT '{"x": 0, "y": 0, "floor": 1}'::jsonb NOT NULL,
    current_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    vacate_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable RLS for seats
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;

-- Now complete the circular reference link in clients
ALTER TABLE public.clients ADD CONSTRAINT fk_client_seat FOREIGN KEY (seat_id) REFERENCES public.seats(id) ON DELETE SET NULL;

-- 5. Support Requests table
CREATE TABLE IF NOT EXISTS public.support_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    seat_number TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    category TEXT CHECK (category IN ('wifi', 'cleaning', 'billing', 'other')) NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT CHECK (status IN ('open', 'in_progress', 'resolved')) DEFAULT 'open' NOT NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable RLS for support_requests
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- 6. Support Notes (internal thread)
CREATE TABLE IF NOT EXISTS public.support_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.support_requests(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable RLS for support_notes
ALTER TABLE public.support_notes ENABLE ROW LEVEL SECURITY;

-- 7. Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable RLS for announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;


--------------------------------------------------------------------------------
-- RLS POLICIES DESIGN
--------------------------------------------------------------------------------

-- Profiles Policies
CREATE POLICY "Allow public read of profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow profiles to update themselves" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Organizations Policies
CREATE POLICY "Allow members to view organization details" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.organization_id = organizations.id
        )
    );

-- Seats Policies
CREATE POLICY "Allow members to view seats" ON public.seats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.organization_id = seats.organization_id
        )
    );

CREATE POLICY "Allow admins to edit seats" ON public.seats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
              AND profiles.organization_id = seats.organization_id 
              AND profiles.role = 'admin'
        )
    );

-- Clients Policies
CREATE POLICY "Allow members to view clients" ON public.clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.organization_id = clients.organization_id
        )
    );

CREATE POLICY "Allow public inserts for onboarding" ON public.clients
    FOR INSERT WITH CHECK (true); -- Public can submit /membership

CREATE POLICY "Allow profiles to edit clients" ON public.clients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.organization_id = clients.organization_id
        )
    );

-- Support Requests Policies
CREATE POLICY "Allow public inserts for tickets" ON public.support_requests
    FOR INSERT WITH CHECK (true); -- Public can submit /support

CREATE POLICY "Allow members to view support requests" ON public.support_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.organization_id = support_requests.organization_id
        )
    );

CREATE POLICY "Allow staff and admin to manage tickets" ON public.support_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.organization_id = support_requests.organization_id
        )
    );

-- Support Notes Policies
CREATE POLICY "Allow members to view support notes" ON public.support_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.support_requests r ON r.id = request_id
            WHERE p.id = auth.uid() AND p.organization_id = r.organization_id
        )
    );

CREATE POLICY "Allow members to insert support notes" ON public.support_notes
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.support_requests r ON r.id = request_id
            WHERE p.id = auth.uid() AND p.organization_id = r.organization_id
        )
    );

-- Announcements Policies
CREATE POLICY "Allow members to read announcements" ON public.announcements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.organization_id = announcements.organization_id
        )
    );

CREATE POLICY "Allow admins to manage announcements" ON public.announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
              AND profiles.organization_id = announcements.organization_id 
              AND profiles.role = 'admin'
        )
    );


--------------------------------------------------------------------------------
-- AUTOMATIC PROFILE PROVISIONING TRIGGER
--------------------------------------------------------------------------------

-- Create profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, is_active, organization_id)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'New Staff Member'),
        COALESCE(new.raw_user_meta_data->>'role', 'staff'),
        TRUE,
        NULL -- Initially unassigned to organization, to be associated by Admin
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
