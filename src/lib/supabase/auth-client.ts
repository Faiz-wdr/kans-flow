import { createClient as createBrowserSupabase } from './client';
import type { StaffProfile } from '@/types';

export const clientAuth = {
  async signIn(email: string, password: string) {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const supabase = createBrowserSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  async getUserProfile() {
    const supabase = createBrowserSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile || profile.is_deleted === true) {
      if (error) console.error('Error fetching user profile:', error);
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
  },
};
