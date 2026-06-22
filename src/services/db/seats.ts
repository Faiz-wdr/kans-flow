import type { SupabaseClient } from '@supabase/supabase-js';
import type { Seat, SeatStatus } from '@/types';
import type { SeatInput } from '@/lib/validators';

/**
 * Fetch all seats for an organization.
 */
export async function getSeats(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('seats')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (error) console.error('Error fetching seats:', error);
  return { data: data as Seat[] | null, error };
}

/**
 * Fetch a single seat details by ID.
 */
export async function getSeatById(supabase: SupabaseClient, seatId: string) {
  const { data, error } = await supabase
    .from('seats')
    .select('*')
    .eq('id', seatId)
    .single();

  if (error) console.error(`Error fetching seat ${seatId}:`, error);
  return { data: data as Seat | null, error };
}

/**
 * Update the occupancy state or properties of a seat.
 */
export async function updateSeat(
  supabase: SupabaseClient,
  seatId: string,
  updates: Partial<Omit<Seat, 'id' | 'organizationId' | 'createdAt'>>
) {
  const { data, error } = await supabase
    .from('seats')
    .update(updates)
    .eq('id', seatId)
    .select()
    .single();

  if (error) console.error(`Error updating seat ${seatId}:`, error);
  return { data: data as Seat | null, error };
}

/**
 * Create a new seat under an organization (Admin only).
 */
export async function createSeat(
  supabase: SupabaseClient,
  organizationId: string,
  seatData: SeatInput
) {
  const { data, error } = await supabase
    .from('seats')
    .insert([
      {
        organization_id: organizationId,
        name: seatData.name,
        type: seatData.type,
        status: seatData.status,
        zone_id: seatData.zoneId,
        layout_id: seatData.layoutId || null,
        coordinates: seatData.coordinates,
      },
    ])
    .select()
    .single();

  if (error) console.error('Error creating seat:', error);
  return { data: data as Seat | null, error };
}

/**
 * Delete a seat configuration (Admin only).
 */
export async function deleteSeat(supabase: SupabaseClient, seatId: string) {
  const { error } = await supabase
    .from('seats')
    .delete()
    .eq('id', seatId);

  if (error) console.error(`Error deleting seat ${seatId}:`, error);
  return { error };
}
