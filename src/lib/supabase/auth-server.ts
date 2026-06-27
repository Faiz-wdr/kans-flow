import { cache } from 'react';
import { createClient as createServerSupabase } from './server';
import type { StaffProfile } from '@/types';

/**
 * ServerAuth - Helper methods for server-side code (runs in Server Components, Server Actions, Route Handlers).
 * Wrapped in React cache() so multiple components in the same request lifecycle reuse identical responses.
 */
export const serverAuth = {
  /**
   * Get the current user model from the server session context.
   */
  getCurrentUser: cache(async () => {
    const supabase = await createServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  }),

  /**
   * Get the current user profile from the database in the server context.
   */
  getUserProfile: cache(async () => {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile || profile.is_deleted === true) {
      if (error) console.error('Error fetching server-side user profile:', error);
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
      employeeId: profile.employee_id,
      email: profile.email,
      mobileNumber: profile.mobile_number,
      jobTitle: profile.job_title,
      notes: profile.notes,
      isDeleted: profile.is_deleted,
    } as StaffProfile;
  }),
};
