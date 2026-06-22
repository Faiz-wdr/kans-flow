-- Enable Supabase Realtime for onboarding_requests table
begin;
  -- Add onboarding_requests to the publication if it's not already added
  alter publication supabase_realtime add table public.onboarding_requests;
commit;

-- Allow public select on organizations so public forms can bind requests and notifications to the workspace organization
DROP POLICY IF EXISTS "org_select_public" ON public.organizations;
CREATE POLICY "org_select_public" ON public.organizations
    FOR SELECT TO public USING (true);

-- Allow public inserts to notifications table so public onboarding requests can notify operators
DROP POLICY IF EXISTS "notifications_insert_public" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_anon" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;

CREATE POLICY "notifications_insert_anon" ON public.notifications
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "notifications_insert_authenticated" ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (true);
