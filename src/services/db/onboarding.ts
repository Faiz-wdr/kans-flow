import type { SupabaseClient } from '@supabase/supabase-js';
import type { OnboardingRequest, OnboardingStatus } from '@/types';
import type { MembershipInput } from '@/lib/validators';
import { mapClientRow } from './clients';
import { createNotification } from '@/lib/notifications/notification-service';

/**
 * Submit onboarding membership application (Public form bypasses auth).
 */
export async function submitOnboardingRequest(
  supabase: SupabaseClient,
  input: MembershipInput
) {
  // 1. Retrieve first organization to bind to public request
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id')
    .limit(1);
  const organizationId = orgs && orgs.length > 0 ? orgs[0].id : null;

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

  const { error } = await supabase
    .from('onboarding_requests')
    .insert([
      {
        organization_id: organizationId,
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        seat_preference: input.seatPreference,
        service: 'Coworking',
        start_date: input.startDate,
        notes: serializedNotes,
        status: 'pending',
      },
    ]);

  if (error) {
    console.error('Error inserting onboarding request:', error);
    return { data: null, error };
  }

  // 3. Create notifications for admins and staff
  if (organizationId) {
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
  }

  return { data: null, error: null };
}

/**
 * Fetch all onboarding requests, ordered by newest first.
 */
export async function getOnboardingRequests(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('onboarding_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching onboarding requests:', error);
    return { data: null, error };
  }

  // Map postgres snake_case columns to camelCase typescript interfaces
  const mapped = (data || []).map((row: any) => {
    let parsedService = row.service;
    let notesObj: any = {};
    if (row.notes) {
      try {
        notesObj = JSON.parse(row.notes);
        if (!parsedService && notesObj.service) parsedService = notesObj.service;
      } catch (e) {}
    }
    return {
      id: row.id,
      organizationId: row.organization_id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      seatPreference: row.seat_preference,
      service: parsedService || 'Coworking',
      startDate: row.start_date,
      notes: row.notes,
      status: row.status,
      reviewedBy: row.reviewed_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      agreementStatus: row.agreement_status || notesObj.agreementStatus || 'Pending',
      agreementToken: row.agreement_token || notesObj.agreementToken,
      agreementTokenExpiresAt: row.agreement_token_expires_at || notesObj.agreementTokenExpiresAt,
      agreementSentAt: row.agreement_sent_at || notesObj.agreementSentAt,
      agreementViewedAt: row.agreement_viewed_at || notesObj.agreementViewedAt,
      agreementSignedAt: row.agreement_signed_at || notesObj.agreementSignedAt,
      signatureImageUrl: row.signature_image_url || notesObj.signatureImageUrl,
      signedPdfUrl: row.signed_pdf_url || notesObj.signedPdfUrl,
      emailSentAt: row.email_sent_at || notesObj.emailSentAt,
      resendCount: row.resend_count ?? notesObj.resendCount ?? 0,
    };
  });

  return { data: mapped as OnboardingRequest[], error: null };
}

/**
 * Reject an onboarding request.
 */
export async function rejectOnboardingRequest(
  supabase: SupabaseClient,
  requestId: string,
  reviewerId?: string
) {
  // Create rejection notification
  const { data: requestData } = await supabase
    .from('onboarding_requests')
    .select('full_name, organization_id')
    .eq('id', requestId)
    .single();

  const { error } = await supabase
    .from('onboarding_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    console.error(`Error deleting onboarding request ${requestId}:`, error);
  } else if (requestData?.organization_id) {
    await createNotification(supabase, {
      organizationId: requestData.organization_id,
      type: 'membership_rejected',
      recipient: { type: 'admin_staff' },
      title: 'Onboarding Request Rejected',
      body: `Membership onboarding request for **${requestData.full_name}** has been rejected.`,
      referenceModule: 'membership',
      priority: 'low',
      actorId: reviewerId,
    });
  }
  return { data: null, error };
}

/**
 * Update onboarding request details (e.g. details edit by admin/staff).
 */
export async function updateOnboardingRequest(
  supabase: SupabaseClient,
  requestId: string,
  updates: {
    fullName?: string;
    email?: string;
    phone?: string;
    startDate?: string;
    notes?: string;
  }
) {
  const dbUpdates: any = {};
  if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('onboarding_requests')
    .update(dbUpdates)
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating onboarding request ${requestId}:`, error);
  }
  return { data, error };
}

/**
 * Approve an onboarding request, provisioning client profile and seat assignment.
 */
export async function approveOnboardingRequest(
  supabase: SupabaseClient,
  request: OnboardingRequest,
  seatId: string,
  reviewerId: string
) {
  // 1. Retrieve organization ID
  let organizationId = request.organizationId;
  if (!organizationId) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();
    organizationId = orgData?.id || null;
  }

  if (!organizationId) {
    return { error: new Error('No active workspace organization found to bind client profile.') };
  }

  // 2. Create client profile
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert([
      {
        organization_id: organizationId,
        full_name: request.fullName,
        email: request.email,
        phone: request.phone,
        status: 'active',
        onboarded_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (clientError) {
    console.error('Error creating client profile during onboarding approval:', clientError);
    return { error: clientError };
  }

  // 3. Create seat assignment if seatId is provided (e.g., for physical Coworking desks)
  if (seatId) {
    const { error: assignmentError } = await supabase
      .from('seat_assignments')
      .insert([
        {
          organization_id: organizationId,
          client_id: client.id,
          seat_id: seatId,
          start_date: request.startDate, // Use the target joining date (could be edited by admin/staff)
          is_active: true,
        },
      ]);

    if (assignmentError) {
      console.error('Error establishing seat lease assignment:', assignmentError);
      return { error: assignmentError };
    }

    // 4. Set seat status to occupied
    const { error: seatError } = await supabase
      .from('seats')
      .update({ status: 'occupied' })
      .eq('id', seatId);

    if (seatError) {
      console.error('Error updating seat occupied state:', seatError);
      return { error: seatError };
    }
  }

  // 5. Update onboarding request status to approved, store the finalized joining date and any edited details
  const { error: requestUpdateError } = await supabase
    .from('onboarding_requests')
    .update({
      status: 'approved',
      full_name: request.fullName,
      email: request.email,
      phone: request.phone,
      notes: typeof request.notes === 'string' ? request.notes : JSON.stringify(request.notes),
      start_date: request.startDate,
      reviewed_by: reviewerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id);

  if (requestUpdateError) {
    console.error('Error finalizing onboarding request status update:', requestUpdateError);
  } else if (organizationId) {
    // Create approval notification
    await createNotification(supabase, {
      organizationId,
      type: 'membership_approved',
      recipient: { type: 'admin_staff' },
      title: 'Onboarding Request Approved',
      body: `Membership onboarding request for **${request.fullName}** has been approved and assigned to seat/cabin.`,
      referenceModule: 'membership',
      priority: 'medium',
      actorId: reviewerId,
    });
  }

  return { data: client ? mapClientRow(client) : null, error: null };
}
