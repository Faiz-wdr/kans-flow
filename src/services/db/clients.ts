import type { SupabaseClient } from '@supabase/supabase-js';
import type { Client, ClientStatus } from '@/types';
import type { MembershipInput } from '@/lib/validators';

/**
 * Utility mapper to convert Postgres snake_case clients columns to camelCase Client interface
 */
export function mapClientRow(row: any): Client {
  return {
    id: row.id,
    organizationId: row.organization_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    onboardedAt: row.onboarded_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch clients by status filter for an organization.
 */
export async function getClients(
  supabase: SupabaseClient,
  organizationId: string,
  status?: ClientStatus
) {
  let query = supabase
    .from('clients')
    .select('*')
    .eq('organization_id', organizationId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) console.error('Error fetching clients:', error);
  const mapped = data ? data.map(mapClientRow) : null;
  return { data: mapped, error };
}

/**
 * Submit onboarding membership application (Public form bypasses auth).
 */
export async function submitMembershipApplication(
  supabase: SupabaseClient,
  input: MembershipInput
) {
  const { data, error } = await supabase
    .from('clients')
    .insert([
      {
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        status: 'onboarding',
        // Start date/notes are currently stored inside json metadata or can be expanded in the schema
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) console.error('Error submitting membership application:', error);
  return { data: data ? mapClientRow(data) : null, error };
}

/**
 * Update client details (e.g. status transition, assigning seat).
 */
export async function updateClient(
  supabase: SupabaseClient,
  clientId: string,
  updates: Partial<Omit<Client, 'id' | 'organizationId' | 'createdAt'>>
) {
  const dbUpdates: any = {};
  if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.onboardedAt !== undefined) dbUpdates.onboarded_at = updates.onboardedAt;
  if (updates.archivedAt !== undefined) dbUpdates.archived_at = updates.archivedAt;

  const { data, error } = await supabase
    .from('clients')
    .update(dbUpdates)
    .eq('id', clientId)
    .select()
    .single();

  if (error) console.error(`Error updating client ${clientId}:`, error);
  return { data: data ? mapClientRow(data) : null, error };
}

/**
 * Onboard client: change status to active, assign seat, and link on seats table.
 */
export async function approveClientOnboarding(
  supabase: SupabaseClient,
  clientId: string,
  organizationId: string,
  seatId: string
) {
  // 1. Update client record
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .update({
      organization_id: organizationId,
      status: 'active',
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .select()
    .single();

  if (clientError) {
    console.error('Error updating client during onboarding:', clientError);
    return { error: clientError };
  }

  // 2. Create seat assignment record
  const { error: assignmentError } = await supabase
    .from('seat_assignments')
    .insert([
      {
        organization_id: organizationId,
        client_id: clientId,
        seat_id: seatId,
        start_date: new Date().toISOString().split('T')[0],
        is_active: true,
      },
    ]);

  if (assignmentError) {
    console.error('Error creating seat assignment during onboarding:', assignmentError);
    return { error: assignmentError };
  }

  // 3. Update seat record status to occupied
  const { error: seatError } = await supabase
    .from('seats')
    .update({
      status: 'occupied',
    })
    .eq('id', seatId);

  if (seatError) {
    console.error('Error updating seat during onboarding:', seatError);
    return { error: seatError };
  }

  return { data: client ? mapClientRow(client) : null, error: null };
}

/**
 * Archive a client instead of deleting them.
 */
export async function archiveClient(supabase: SupabaseClient, clientId: string) {
  // 1. Archive client
  const { data, error } = await supabase
    .from('clients')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .select()
    .single();

  if (error) {
    console.error(`Error archiving client ${clientId}:`, error);
    return { data: data as Client | null, error };
  }

  // 2. Set any active assignments to inactive
  const { error: assignmentError } = await supabase
    .from('seat_assignments')
    .update({
      is_active: false,
      end_date: new Date().toISOString().split('T')[0],
    })
    .eq('client_id', clientId)
    .eq('is_active', true);

  if (assignmentError) {
    console.error(`Error deactivating assignments for archived client ${clientId}:`, assignmentError);
  }

  return { data: data ? mapClientRow(data) : null, error };
}
