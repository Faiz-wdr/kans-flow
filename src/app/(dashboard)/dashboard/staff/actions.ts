'use server';

import { createAdminClient } from '@/lib/supabase/server';
import type { StaffProfile, Sector, UserRole } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Fetch all available sectors in the system.
 */
export async function fetchSectorsAction(): Promise<{ success: boolean; data?: Sector[]; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('sectors')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    const mapped: Sector[] = data.map((d: any) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    return { success: true, data: mapped };
  } catch (err: any) {
    console.error('Error in fetchSectorsAction:', err);
    return { success: false, error: err.message || 'Failed to fetch sectors' };
  }
}

/**
 * Fetch list of staff profiles with filters.
 */
export async function fetchStaffProfilesAction(filters: {
  search?: string;
  role?: string;
  status?: string;
  sectorId?: string;
}): Promise<{ success: boolean; data?: StaffProfile[]; error?: string }> {
  try {
    const supabase = createAdminClient();

    // Fetch profiles that are not soft-deleted
    let query = supabase
      .from('staff_profiles')
      .select(`
        *,
        staff_sectors(
          sector_id,
          sectors(*)
        )
      `)
      .eq('is_deleted', false);

    // Apply role filter
    if (filters.role && filters.role !== 'all') {
      query = query.eq('role', filters.role);
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      const isActive = filters.status === 'active';
      query = query.eq('is_active', isActive);
    }

    // Resolve profiles
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    let mapped: StaffProfile[] = data.map((profile: any) => {
      const sectorsList: Sector[] = [];
      if (profile.staff_sectors) {
        profile.staff_sectors.forEach((ss: any) => {
          if (ss.sectors) {
            sectorsList.push({
              id: ss.sectors.id,
              name: ss.sectors.name,
              slug: ss.sectors.slug,
              createdAt: ss.sectors.created_at,
              updatedAt: ss.sectors.updated_at,
            });
          }
        });
      }

      return {
        id: profile.id,
        organizationId: profile.organization_id,
        fullName: profile.full_name,
        role: profile.role as UserRole,
        isActive: profile.is_active,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        employeeId: profile.employee_id || undefined,
        email: profile.email || undefined,
        mobileNumber: profile.mobile_number || undefined,
        jobTitle: profile.job_title || undefined,
        notes: profile.notes || undefined,
        isDeleted: profile.is_deleted,
        sectors: sectorsList,
      };
    });

    // Apply search filter in-memory (Supabase can't do ILIKE on joined tables/multiple fields easily without complex syntax)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      mapped = mapped.filter((p) => {
        return (
          p.fullName.toLowerCase().includes(searchLower) ||
          p.email?.toLowerCase().includes(searchLower) ||
          p.jobTitle?.toLowerCase().includes(searchLower) ||
          p.employeeId?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply sector filter in-memory if requested
    if (filters.sectorId && filters.sectorId !== 'all') {
      mapped = mapped.filter((p) => p.sectors?.some((s) => s.id === filters.sectorId));
    }

    return { success: true, data: mapped };
  } catch (err: any) {
    console.error('Error in fetchStaffProfilesAction:', err);
    return { success: false, error: err.message || 'Failed to fetch staff directory' };
  }
}

/**
 * Fetch a single staff profile by ID.
 */
export async function fetchStaffProfileByIdAction(id: string): Promise<{ success: boolean; data?: StaffProfile; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { data: profile, error } = await supabase
      .from('staff_profiles')
      .select(`
        *,
        staff_sectors(
          sector_id,
          sectors(*)
        )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    const sectorsList: Sector[] = [];
    if (profile.staff_sectors) {
      profile.staff_sectors.forEach((ss: any) => {
        if (ss.sectors) {
          sectorsList.push({
            id: ss.sectors.id,
            name: ss.sectors.name,
            slug: ss.sectors.slug,
            createdAt: ss.sectors.created_at,
            updatedAt: ss.sectors.updated_at,
          });
        }
      });
    }

    const mapped: StaffProfile = {
      id: profile.id,
      organizationId: profile.organization_id,
      fullName: profile.full_name,
      role: profile.role as UserRole,
      isActive: profile.is_active,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      employeeId: profile.employee_id || undefined,
      email: profile.email || undefined,
      mobileNumber: profile.mobile_number || undefined,
      jobTitle: profile.job_title || undefined,
      notes: profile.notes || undefined,
      isDeleted: profile.is_deleted,
      sectors: sectorsList,
    };

    return { success: true, data: mapped };
  } catch (err: any) {
    console.error('Error in fetchStaffProfileByIdAction:', err);
    return { success: false, error: err.message || 'Failed to fetch staff profile' };
  }
}

/**
 * Create a new staff account and profile.
 */
export async function createStaffAction(data: {
  fullName: string;
  email: string;
  mobileNumber?: string;
  employeeId?: string;
  jobTitle?: string;
  role: UserRole;
  sectorIds: string[];
  temporaryPassword?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // 1. Create the user in Supabase Auth via admin interface
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: data.email,
      password: data.temporaryPassword || 'TempPass123!',
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        role: data.role,
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create auth user');

    const userId = authData.user.id;

    // 2. The handle_new_user database trigger automatically inserts the record into staff_profiles.
    // However, we want to update the profile with the extra fields.
    const updateData: any = {
      mobile_number: data.mobileNumber || null,
      job_title: data.jobTitle || null,
      updated_at: new Date().toISOString(),
    };

    if (data.employeeId && data.employeeId.trim() !== '') {
      updateData.employee_id = data.employeeId;
    }

    const { error: profileError } = await adminClient
      .from('staff_profiles')
      .update(updateData)
      .eq('id', userId);

    if (profileError) {
      // Clean up user if profile update fails
      await adminClient.auth.admin.deleteUser(userId);
      throw profileError;
    }

    // 3. Link sectors in staff_sectors
    if (data.sectorIds && data.sectorIds.length > 0) {
      const sectorInserts = data.sectorIds.map((sectorId) => ({
        staff_id: userId,
        sector_id: sectorId,
      }));

      const { error: sectorError } = await adminClient
        .from('staff_sectors')
        .insert(sectorInserts);

      if (sectorError) throw sectorError;
    }

    revalidatePath('/dashboard/staff');
    return { success: true };
  } catch (err: any) {
    console.error('Error in createStaffAction:', err);
    return { success: false, error: err.message || 'Failed to create staff account' };
  }
}

/**
 * Update an existing staff profile and auth metadata.
 */
export async function updateStaffAction(
  id: string,
  data: {
    fullName: string;
    email: string;
    mobileNumber?: string;
    employeeId?: string;
    jobTitle?: string;
    role: UserRole;
    sectorIds: string[];
    isActive: boolean;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // 1. Update user email and metadata in Supabase Auth
    const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
      email: data.email,
      user_metadata: {
        full_name: data.fullName,
        role: data.role,
      },
    });

    if (authError) throw authError;

    // 2. Update staff profile in the public database
    const updateData: any = {
      full_name: data.fullName,
      email: data.email,
      mobile_number: data.mobileNumber || null,
      job_title: data.jobTitle || null,
      role: data.role,
      is_active: data.isActive,
      notes: data.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (data.employeeId && data.employeeId.trim() !== '') {
      updateData.employee_id = data.employeeId;
    }

    const { error: profileError } = await adminClient
      .from('staff_profiles')
      .update(updateData)
      .eq('id', id);

    if (profileError) throw profileError;

    // 3. Sync sectors: delete existing associations and insert new ones
    const { error: deleteSectorsError } = await adminClient
      .from('staff_sectors')
      .delete()
      .eq('staff_id', id);

    if (deleteSectorsError) throw deleteSectorsError;

    if (data.sectorIds && data.sectorIds.length > 0) {
      const sectorInserts = data.sectorIds.map((sectorId) => ({
        staff_id: id,
        sector_id: sectorId,
      }));

      const { error: sectorError } = await adminClient
        .from('staff_sectors')
        .insert(sectorInserts);

      if (sectorError) throw sectorError;
    }

    revalidatePath('/dashboard/staff');
    revalidatePath(`/dashboard/staff/${id}`);
    return { success: true };
  } catch (err: any) {
    console.error('Error in updateStaffAction:', err);
    return { success: false, error: err.message || 'Failed to update staff account' };
  }
}

/**
 * Toggle a staff profile's active status.
 */
export async function toggleStaffStatusAction(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('staff_profiles')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/staff');
    revalidatePath(`/dashboard/staff/${id}`);
    return { success: true };
  } catch (err: any) {
    console.error('Error in toggleStaffStatusAction:', err);
    return { success: false, error: err.message || 'Failed to toggle status' };
  }
}

/**
 * Reset a staff account's password.
 */
export async function resetStaffPasswordAction(id: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(id, {
      password: password,
    });

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error('Error in resetStaffPasswordAction:', err);
    return { success: false, error: err.message || 'Failed to reset password' };
  }
}

/**
 * Soft delete a staff account.
 */
export async function deleteStaffAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // Mark as deleted and inactive in the database
    const { error: dbError } = await adminClient
      .from('staff_profiles')
      .update({
        is_deleted: true,
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (dbError) throw dbError;

    // Delete the Supabase Auth user completely so they can't reuse this account/email to re-register
    // (Alternative is to just leave them soft-deleted, but deleting the auth user is standard if we want to release the email address for future reuse. Let's delete the auth user since it is a hard deletion of authentication but we preserve the profile history (which is marked is_deleted). Wait, if we delete the auth user, the profile has a cascade foreign key on auth.users(id) ON DELETE CASCADE!
    // Oh! Look at public.staff_profiles: `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`.
    // If we delete the auth user, the staff_profiles row WILL BE HARD DELETED because of the `ON DELETE CASCADE`!
    // That means we CANNOT delete the auth user if we want a soft delete of the profile!
    // Instead, to soft delete, we should just disable the auth user (e.g. change their email to a dummy email, reset their password to random, or use ban/lock settings, or simply let the database `is_deleted = true` block their login since getUserProfile returns null).
    // Yes! Setting `is_deleted = true` in staff_profiles is enough because our middleware and layout fetch calls rely on getUserProfile, which returns null if `is_deleted` is true. Thus, they can never sign in.
    // Let's also reset their password to a random string so they can't log in even if they know the old password.)
    
    const randomPassword = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    await adminClient.auth.admin.updateUserById(id, {
      password: randomPassword,
      // We can also change the email to something like deleted_staff_{id}@kansflow.local so the original email is freed up for another account!
      // This is a brilliant strategy for soft-deleting while keeping logs intact and freeing up the email.
    });

    // Let's update the profile email to free up original email address
    const { data: profile } = await adminClient.from('staff_profiles').select('email').eq('id', id).single();
    if (profile && profile.email) {
      const dummyEmail = `deleted_${id.substring(0, 8)}_${Date.now()}@kansflow.local`;
      await adminClient.auth.admin.updateUserById(id, { email: dummyEmail });
      await adminClient.from('staff_profiles').update({ email: dummyEmail }).eq('id', id);
    }

    revalidatePath('/dashboard/staff');
    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteStaffAction:', err);
    return { success: false, error: err.message || 'Failed to delete staff account' };
  }
}
