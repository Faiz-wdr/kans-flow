-- 1. Update trigger function to insert into public.staff_profiles and bind to the default organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_org_id UUID;
BEGIN
    -- Get the first organization's ID
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;

    INSERT INTO public.staff_profiles (id, organization_id, full_name, role, is_active)
    VALUES (
        new.id,
        default_org_id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'New Staff Member'),
        COALESCE(new.raw_user_meta_data->>'role', 'staff')::public.user_role,
        TRUE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pgcrypto if not enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Insert admin user into auth.users (mock credentials)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'admin@kansflow.com',
    crypt('password123', gen_salt('bf')),
    now(),
    null,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Mock Admin User","role":"admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- 3. Insert staff user into auth.users (mock credentials)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'staff@kansflow.com',
    crypt('password123', gen_salt('bf')),
    now(),
    null,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Mock Staff Member","role":"staff"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- 4. Seed staff profiles in public.staff_profiles for the above users
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;

    IF default_org_id IS NOT NULL THEN
        -- Insert admin profile
        INSERT INTO public.staff_profiles (id, organization_id, full_name, role, is_active)
        VALUES (
            '00000000-0000-0000-0000-000000000001',
            default_org_id,
            'Mock Admin User',
            'admin',
            TRUE
        ) ON CONFLICT (id) DO NOTHING;

        -- Insert staff profile
        INSERT INTO public.staff_profiles (id, organization_id, full_name, role, is_active)
        VALUES (
            '00000000-0000-0000-0000-000000000002',
            default_org_id,
            'Mock Staff Member',
            'staff',
            TRUE
        ) ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 5. Bind any existing onboarding requests with NULL organization_id to default org
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    IF default_org_id IS NOT NULL THEN
        UPDATE public.onboarding_requests
        SET organization_id = default_org_id
        WHERE organization_id IS NULL;
    END IF;
END $$;
