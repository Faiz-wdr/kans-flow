import { createClient as createBrowserSupabase } from './client';
import type { StaffProfile } from '@/types';

export const clientAuth = {
  async signIn(email: string, password: string) {
    const isMockEnabled = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === 'true';
    if (isMockEnabled) {
      if (email === 'admin@kansflow.com' || email === 'staff@kansflow.com') {
        const role = email.startsWith('admin') ? 'admin' : 'staff';
        document.cookie = `sb-mock-role=${role}; path=/; max-age=86400; SameSite=Lax`;
        
        // Establish authenticated session in Supabase Auth using seeded mock credentials for RLS compliance
        try {
          const supabase = createBrowserSupabase();
          await supabase.auth.signInWithPassword({
            email,
            password: 'password123',
          });
        } catch (authErr) {
          console.warn('Supabase Auth bypass sign-in error:', authErr);
        }

        return { data: { user: {} }, error: null };
      }
    }

    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    const isMockEnabled = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === 'true';
    if (isMockEnabled) {
      document.cookie = 'sb-mock-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const isMockEnabled = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === 'true';
    if (isMockEnabled && typeof document !== 'undefined') {
      const mockRole = document.cookie
        .split('; ')
        .find((row) => row.startsWith('sb-mock-role='))
        ?.split('=')[1];
      if (mockRole === 'admin' || mockRole === 'staff') {
        const mockUser = {
          id: mockRole === 'admin' ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002',
          app_metadata: { role: mockRole },
          user_metadata: { role: mockRole, full_name: mockRole === 'admin' ? 'Mock Admin User' : 'Mock Staff Member' },
          email: `${mockRole}@kansflow.local`,
        };
        return { user: mockUser as any, error: null };
      }
    }

    const supabase = createBrowserSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  async getUserProfile() {
    const isMockEnabled = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === 'true';
    if (isMockEnabled && typeof document !== 'undefined') {
      const mockRole = document.cookie
        .split('; ')
        .find((row) => row.startsWith('sb-mock-role='))
        ?.split('=')[1];
      if (mockRole === 'admin' || mockRole === 'staff') {
        // Retrieve first organization dynamically to avoid hardcoded mock ID mismatches
        const supabase = createBrowserSupabase();
        const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
        const organizationId = orgs && orgs.length > 0 ? orgs[0].id : '00000000-0000-0000-0000-000000000000';

        return {
          id: mockRole === 'admin' ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002',
          organizationId,
          fullName: mockRole === 'admin' ? 'Mock Admin User' : 'Mock Staff Member',
          role: mockRole as any,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as StaffProfile;
      }
    }

    const supabase = createBrowserSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return {
      id: profile.id,
      organizationId: profile.organization_id,
      fullName: profile.full_name,
      role: profile.role,
      isActive: profile.is_active,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    } as StaffProfile;
  },
};
