import { createClient as createServerSupabase } from './server';
import type { StaffProfile } from '@/types';
import { cookies } from 'next/headers';

/**
 * ServerAuth - Helper methods for server-side code (runs in Server Components, Server Actions, Route Handlers).
 */
export const serverAuth = {
  /**
   * Get the current user model from the server session context.
   */
  async getCurrentUser() {
    if (process.env.NODE_ENV === 'development') {
      const cookieStore = await cookies();
      const mockRole = cookieStore.get('sb-mock-role')?.value;
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

    const supabase = await createServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  /**
   * Get the current user profile from the database in the server context.
   */
  async getUserProfile() {
    if (process.env.NODE_ENV === 'development') {
      const cookieStore = await cookies();
      const mockRole = cookieStore.get('sb-mock-role')?.value;
      if (mockRole === 'admin' || mockRole === 'staff') {
        const supabase = await createServerSupabase();
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

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching server-side user profile:', error);
      return null;
    }

    return profile as StaffProfile;
  },
};
