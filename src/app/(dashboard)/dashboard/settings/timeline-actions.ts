'use server';

import { createClient } from '@/lib/supabase/server';
import { serverAuth } from '@/lib/supabase/auth-server';
import type { CompanyTimeline } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Verifies that the current user has the 'admin' role.
 * Throws an error or returns false if unauthorized.
 */
async function verifyAdmin(): Promise<boolean> {
  const profile = await serverAuth.getUserProfile();
  return !!(profile && profile.role === 'admin');
}

/**
 * Fetch all company milestones from public.company_timeline.
 * Restricted to admins only.
 */
export async function fetchTimelineAction(): Promise<{ success: boolean; data?: CompanyTimeline[]; error?: string }> {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized. Admin access only.' };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('company_timeline')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped: CompanyTimeline[] = data.map((d: any) => ({
      id: d.id,
      date: d.date,
      heading: d.heading,
      description: d.description,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    return { success: true, data: mapped };
  } catch (err: any) {
    console.error('Error in fetchTimelineAction:', err);
    return { success: false, error: err.message || 'Failed to fetch timeline milestones' };
  }
}

/**
 * Create a new milestone in public.company_timeline.
 */
export async function createMilestoneAction(data: {
  date: string;
  heading: string;
  description: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized. Admin access only.' };
    }

    // Input Validation
    if (!data.date || !data.heading.trim() || !data.description.trim()) {
      return { success: false, error: 'All fields (Date, Heading, Description) are required.' };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('company_timeline')
      .insert([
        {
          date: data.date,
          heading: data.heading.trim(),
          description: data.description.trim(),
        },
      ]);

    if (error) throw error;

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (err: any) {
    console.error('Error in createMilestoneAction:', err);
    return { success: false, error: err.message || 'Failed to create milestone' };
  }
}

/**
 * Update an existing milestone in public.company_timeline.
 */
export async function updateMilestoneAction(
  id: string,
  data: {
    date: string;
    heading: string;
    description: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized. Admin access only.' };
    }

    // Input Validation
    if (!id || !data.date || !data.heading.trim() || !data.description.trim()) {
      return { success: false, error: 'All fields (Date, Heading, Description) are required.' };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('company_timeline')
      .update({
        date: data.date,
        heading: data.heading.trim(),
        description: data.description.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (err: any) {
    console.error('Error in updateMilestoneAction:', err);
    return { success: false, error: err.message || 'Failed to update milestone' };
  }
}

/**
 * Delete a milestone from public.company_timeline.
 */
export async function deleteMilestoneAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized. Admin access only.' };
    }

    if (!id) {
      return { success: false, error: 'Milestone ID is required.' };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('company_timeline')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteMilestoneAction:', err);
    return { success: false, error: err.message || 'Failed to delete milestone' };
  }
}
