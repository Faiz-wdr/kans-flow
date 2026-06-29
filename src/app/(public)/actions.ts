'use server';

import { createClient as createBaseClient } from '@supabase/supabase-js';
import type { MembershipInput, SupportRequestInput, VirtualOfficeInput } from '@/lib/validators';
import { createNotification } from '@/lib/notifications/notification-service';

// Reusable service-role client for server-side trusted operations
function getAdminSupabase() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
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
      service: 'Coworking',
      emergencyContact: input.emergencyContact,
      address: input.address,
      idProofType: input.idProofType,
      idProofUrl: input.idProofUrl,
      purposeType: input.purposeType,
      purposeDetails: input.purposeDetails,
      userNotes: input.notes || '',
    });

    let insertPayload: any = {
      organization_id: organizationId,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      seat_preference: input.seatPreference,
      service: 'Coworking',
      start_date: input.startDate,
      notes: serializedNotes,
      status: 'pending',
    };

    let { error: insertError } = await supabase
      .from('onboarding_requests')
      .insert([insertPayload]);

    // Fallback if DB schema cache has not reloaded the new 'service' column yet
    if (insertError && (insertError.message.includes('service') || insertError.message.includes('schema cache'))) {
      console.warn('[Action] Retrying onboarding insert without explicit service column due to DB schema cache lag...');
      delete insertPayload.service;
      const fallbackResult = await supabase
        .from('onboarding_requests')
        .insert([insertPayload]);
      insertError = fallbackResult.error;
    }

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
 * Server-side Virtual Office application submission.
 */
export async function submitVirtualOfficeAction(input: VirtualOfficeInput) {
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

    // 2. Serialize Virtual Office details into notes JSON (including service tag)
    // 2. Generate secure signing token and prepare notes payload
    const token = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    const sentAt = new Date().toISOString();

    const serializedNotes = JSON.stringify({
      service: 'Virtual Office',
      plan: input.plan,
      companyName: input.companyName,
      natureOfBusiness: input.natureOfBusiness,
      natureOfBusinessOther: input.natureOfBusinessOther || '',
      email1: input.email1,
      email2: input.email2 || '',
      companyLogoUrl: input.companyLogoUrl || '',
      gstin: input.gstin || '',
      stampPaper: input.stampPaper,
      reasonForVo: input.reasonForVo,
      reasonForVoOther: input.reasonForVoOther || '',
      biggestChallenge: input.biggestChallenge,
      currentProblem: input.currentProblem,
      consultantHandling: input.consultantHandling,
      hearAboutUs: input.hearAboutUs,
      hearAboutUsOther: input.hearAboutUsOther || '',
      tentativeCompletionDate: input.tentativeCompletionDate,
      agreementStatus: 'Sent',
      agreementToken: token,
      agreementTokenExpiresAt: tokenExpiresAt,
      agreementSentAt: sentAt,
    });

    let insertPayload: any = {
      organization_id: organizationId,
      full_name: input.companyName,
      email: input.email1,
      phone: 'N/A',
      seat_preference: 'cabin',
      service: 'Virtual Office',
      start_date: input.startDate,
      notes: serializedNotes,
      status: 'approved',
      agreement_status: 'Sent',
      agreement_token: token,
      agreement_token_expires_at: tokenExpiresAt,
      agreement_sent_at: sentAt,
      email_sent_at: sentAt,
      resend_count: 1,
    };

    let { data: insertedData, error: insertError } = await supabase
      .from('onboarding_requests')
      .insert([insertPayload])
      .select('id')
      .single();

    // Fallback if DB schema cache has not reloaded new columns yet
    if (insertError) {
      console.warn('[Action] Retrying Virtual Office insert fallback due to schema cache lag...', insertError.message);
      delete insertPayload.service;
      delete insertPayload.agreement_status;
      delete insertPayload.agreement_token;
      delete insertPayload.agreement_token_expires_at;
      delete insertPayload.agreement_sent_at;
      delete insertPayload.email_sent_at;
      delete insertPayload.resend_count;
      const fallbackResult = await supabase
        .from('onboarding_requests')
        .insert([insertPayload])
        .select('id')
        .single();
      insertedData = fallbackResult.data;
      insertError = fallbackResult.error;
    }

    if (insertError || !insertedData) {
      console.error('[Action] Error inserting Virtual Office request:', insertError);
      return { success: false, error: insertError?.message || 'Error creating application record.' };
    }

    // Provision active client profile immediately
    try {
      await supabase.from('clients').insert([
        {
          organization_id: organizationId,
          full_name: input.companyName,
          email: input.email1,
          phone: 'N/A',
          status: 'active',
          onboarded_at: new Date().toISOString(),
        },
      ]);
    } catch (clientErr) {
      console.warn('[Action] Client auto-provisioning warning:', clientErr);
    }

    // 3. Dispatch Agreement Review Email via Resend
    const { sendAgreementReviewEmail } = await import('@/lib/email/email-service');
    await sendAgreementReviewEmail({
      clientEmail: input.email1,
      clientName: input.companyName,
      companyName: input.companyName,
      token,
      expiresAt: tokenExpiresAt,
    });

    // 4. Create notification for Admin and Staff
    const notificationMessage = `New Virtual Office application received from **${input.companyName}** (${input.plan} Plan). Agreement email dispatched.`;
    
    await createNotification(supabase, {
      organizationId,
      type: 'membership_submitted',
      recipient: { type: 'admin_staff' },
      title: 'New Virtual Office Application',
      body: notificationMessage,
      referenceModule: 'virtual_office',
      referenceId: insertedData.id,
      priority: 'high',
    });

    // 5. Record Activity Logs
    try {
      await supabase.from('onboarding_activity_logs').insert([
        { request_id: insertedData.id, action: 'Application Submitted', details: `Virtual office form submitted for ${input.companyName}` },
        { request_id: insertedData.id, action: 'Agreement Generated', details: `Generated secure token ${token}` },
        { request_id: insertedData.id, action: 'Email Sent', details: `Resend agreement review link sent to ${input.email1}` },
      ]);
    } catch (err) {}

    return { success: true, referenceId: insertedData.id };
  } catch (err: any) {
    console.error('[Action] submitVirtualOfficeAction unhandled error:', err);
    return { success: false, error: err.message || 'Server error occurred during Virtual Office submission.' };
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
