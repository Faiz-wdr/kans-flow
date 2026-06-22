import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupportRequest, SupportNote, SupportStatus } from '@/types';
import type { SupportRequestInput } from '@/lib/validators';

/**
 * Fetch all support requests for an organization, filtered optional by status.
 */
export async function getSupportRequests(
  supabase: SupabaseClient,
  organizationId: string,
  status?: SupportStatus
) {
  let query = supabase
    .from('support_requests')
    .select('*')
    .eq('organization_id', organizationId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) console.error('Error fetching support requests:', error);
  return { data: data as SupportRequest[] | null, error };
}

/**
 * Public Form Submission: Log a new support request ticket (unauthenticated).
 */
export async function createSupportRequest(
  supabase: SupabaseClient,
  input: SupportRequestInput
) {
  const { data, error } = await supabase
    .from('support_requests')
    .insert([
      {
        client_id: input.clientId || null,
        name: input.name,
        email: input.email,
        seat_number: input.seatNumber,
        category: input.category,
        subject: input.category === 'vacate' ? 'Vacate Notice' : `${input.category.toUpperCase()} Request`,
        description: input.description,
        image_url: input.imageUrl || null,
        status: 'open',
        priority: input.priority || (input.category === 'vacate' ? 'high' : 'medium'),
        expected_vacate_date: input.expectedVacateDate || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) console.error('Error creating support request:', error);
  return { data: data ? (data as unknown as SupportRequest) : null, error };
}

/**
 * Update support ticket parameters (status, assignee, details).
 */
export async function updateSupportRequest(
  supabase: SupabaseClient,
  ticketId: string,
  updates: Partial<Omit<SupportRequest, 'id' | 'organizationId' | 'createdAt'>>
) {
  const { data, error } = await supabase
    .from('support_requests')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .select()
    .single();

  if (error) console.error(`Error updating support request ${ticketId}:`, error);
  return { data: data as SupportRequest | null, error };
}

/**
 * Fetch the internal notes timeline thread for a ticket.
 */
export async function getSupportNotes(supabase: SupabaseClient, requestId: string) {
  const { data, error } = await supabase
    .from('support_notes')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) console.error(`Error fetching support notes for ticket ${requestId}:`, error);
  return { data: data as SupportNote[] | null, error };
}

/**
 * Add an internal note to a support request ticket (Staff/Admin only).
 */
export async function createSupportNote(
  supabase: SupabaseClient,
  requestId: string,
  authorId: string,
  noteContent: string
) {
  const { data, error } = await supabase
    .from('support_notes')
    .insert([
      {
        request_id: requestId,
        author_id: authorId,
        note: noteContent,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) console.error('Error creating internal support note:', error);
  return { data: data as SupportNote | null, error };
}

/**
 * Delete a support request ticket (Admin only).
 */
export async function deleteSupportRequest(
  supabase: SupabaseClient,
  ticketId: string
) {
  const { data, error } = await supabase
    .from('support_requests')
    .delete()
    .eq('id', ticketId)
    .select()
    .single();

  if (error) console.error(`Error deleting support request ${ticketId}:`, error);
  return { data: data as SupportRequest | null, error };
}

/**
 * Delete a support note (author only, enforced by RLS).
 */
export async function deleteSupportNote(
  supabase: SupabaseClient,
  noteId: string
) {
  const { data, error } = await supabase
    .from('support_notes')
    .delete()
    .eq('id', noteId)
    .select()
    .single();

  if (error) console.error(`Error deleting support note ${noteId}:`, error);
  return { data, error };
}
