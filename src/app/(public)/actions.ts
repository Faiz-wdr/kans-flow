'use server';

import { createClient as createBaseClient } from '@supabase/supabase-js';
import type { MembershipInput, SupportRequestInput } from '@/lib/validators';
import { createNotification } from '@/lib/notifications/notification-service';

// Reusable service-role client for server-side trusted operations
function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server environment missing Supabase service credentials.');
  }
  return createBaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Server-side membership application submission.
 * Runs under service role credentials to safely query organization and insert notifications.
 */
export async function submitMembershipAction(input: MembershipInput) {
  try {
    const supabase = getAdminSupabase();

    // 1. Retrieve first organization to bind to public request
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (orgError) {
      console.error('[Action] Error fetching organization:', orgError);
      return { success: false, error: orgError.message };
    }

    const organizationId = orgs && orgs.length > 0 ? orgs[0].id : null;
    if (!organizationId) {
      return { success: false, error: 'No workspace organization found.' };
    }

    // 2. Serialize secondary metadata details into existing 'notes' text column as JSON
    const serializedNotes = JSON.stringify({
      emergencyContact: input.emergencyContact,
      address: input.address,
      idProofType: input.idProofType,
      idProofUrl: input.idProofUrl,
      purposeType: input.purposeType,
      purposeDetails: input.purposeDetails,
      userNotes: input.notes || '',
    });

    const { error: insertError } = await supabase
      .from('onboarding_requests')
      .insert([
        {
          organization_id: organizationId,
          full_name: input.fullName,
          email: input.email,
          phone: input.phone,
          seat_preference: input.seatPreference,
          start_date: input.startDate,
          notes: serializedNotes,
          status: 'pending',
        },
      ]);

    if (insertError) {
      console.error('[Action] Error inserting onboarding request:', insertError);
      return { success: false, error: insertError.message };
    }

    // 3. Create notification using service role client (bypasses RLS)
    const seatPref = input.seatPreference
      ? input.seatPreference.charAt(0).toUpperCase() + input.seatPreference.slice(1)
      : 'Unspecified';
    const notificationMessage = `New membership onboarding request submitted for **${input.fullName}** (Preference: **${seatPref}**).`;
    
    await createNotification(supabase, {
      organizationId,
      type: 'membership_submitted',
      recipient: { type: 'admin_staff' },
      title: 'New Onboarding Request',
      body: notificationMessage,
      referenceModule: 'membership',
      priority: 'medium',
    });

    return { success: true };
  } catch (err: any) {
    console.error('[Action] submitMembershipAction unhandled error:', err);
    return { success: false, error: err.message || 'Server error occurred during submission.' };
  }
}

/**
 * Server-side support ticket submission.
 * Runs under service role credentials to safely insert support requests and notifications.
 */
export async function submitSupportTicketAction(
  formData: SupportRequestInput,
  expectedVacateDate: string | null,
  selectedMemberId: string | null,
  selectedMemberOrgId: string | null
) {
  try {
    const supabase = getAdminSupabase();

    // 1. Resolve organization ID
    let orgId = selectedMemberOrgId;
    if (!orgId) {
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);

      if (orgError) {
        console.error('[Action] Error fetching organization for support ticket:', orgError);
        return { success: false, error: orgError.message };
      }
      orgId = orgs && orgs.length > 0 ? orgs[0].id : null;
    }

    if (!orgId) {
      return { success: false, error: 'No workspace organization found.' };
    }

    // 2. Insert Support Request
    const { data: ticket, error: ticketErr } = await supabase
      .from('support_requests')
      .insert([
        {
          organization_id: orgId,
          client_id: selectedMemberId || null,
          seat_number: formData.seatNumber,
          name: formData.name,
          email: formData.email,
          category: formData.category,
          subject: formData.category === 'vacate' ? 'Vacate Notice' : `${formData.category.toUpperCase()} Request`,
          description: formData.description,
          image_url: formData.imageUrl || null,
          status: 'open',
          priority: formData.priority,
          expected_vacate_date: expectedVacateDate || null,
        }
      ])
      .select()
      .single();

    if (ticketErr) {
      console.error('[Action] Error inserting support request:', ticketErr);
      return { success: false, error: ticketErr.message };
    }

    // 3. Create notification using service role client
    const categoryTitle = formData.category.charAt(0).toUpperCase() + formData.category.slice(1);
    const notificationMsg = formData.category === 'vacate'
      ? `New Vacate Notice submitted by **${formData.name}** (**${formData.seatNumber}**).`
      : `New support request [**${categoryTitle}**] (${ticket.ticket_number || '#0000'}) received from **${formData.name}** (**${formData.seatNumber}**).`;

    await createNotification(supabase, {
      organizationId: orgId,
      type: formData.category === 'vacate' ? 'seat_vacating' : 'support_submitted',
      recipient: { type: 'admin_staff' },
      title: formData.category === 'vacate' ? 'Vacate Notice' : 'New Support Request',
      body: notificationMsg,
      referenceModule: 'support',
      referenceId: ticket.id,
      priority: formData.priority,
    });

    return { success: true, ticketNumber: ticket.ticket_number || '#0000' };
  } catch (err: any) {
    console.error('[Action] submitSupportTicketAction unhandled error:', err);
    return { success: false, error: err.message || 'Server error occurred during support ticket submission.' };
  }
}
