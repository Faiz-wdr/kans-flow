'use me'; // nextjs server action
'use server';

import { createClient } from '@supabase/supabase-js';
import { prepareAgreementData, renderAgreementHtml } from '@/lib/agreements/agreement-template';
import { generateSignedAgreementPdfBuffer } from '@/lib/agreements/pdf-generator';
import { sendSignedAgreementEmails } from '@/lib/email/email-service';

function getAdminSupabase() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const baseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(baseUrl, serviceKey);
}

async function findRequestByToken(supabase: any, token: string) {
  if (!token) return null;
  try {
    const { data } = await supabase.from('onboarding_requests').select('*').eq('agreement_token', token).maybeSingle();
    if (data) return data;
  } catch (e) {}

  const { data: allReqs } = await supabase.from('onboarding_requests').select('*').order('created_at', { ascending: false }).limit(100);
  if (allReqs) {
    const match = allReqs.find((r: any) => {
      if (r.agreement_token === token) return true;
      if (r.notes) {
        try {
          const parsed = JSON.parse(r.notes);
          if (parsed.agreementToken === token) return true;
        } catch (e) {}
      }
      return false;
    });
    if (match) return match;
  }
  return null;
}

/**
 * Verify secure signing token and mark agreement as viewed
 */
export async function verifyAgreementTokenAction(token: string) {
  try {
    const supabase = getAdminSupabase();
    const request = await findRequestByToken(supabase, token);

    if (!request) {
      return { success: false, error: 'Invalid or expired signing link.' };
    }

    let notesObj: any = {};
    if (request.notes) {
      try { notesObj = JSON.parse(request.notes); } catch (e) {}
    }

    const tokenExpiresAt = request.agreement_token_expires_at || notesObj.agreementTokenExpiresAt;
    if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) {
      return { success: false, error: 'This signing link has expired. Please request a new link from KANs HUB admin.' };
    }

    const currentStatus = request.agreement_status || notesObj.agreementStatus || 'Pending';
    const currentViewedAt = request.agreement_viewed_at || notesObj.agreementViewedAt;

    const mappedRequest: any = {
      id: request.id,
      organizationId: request.organization_id,
      fullName: request.full_name,
      email: request.email,
      phone: request.phone,
      seatPreference: request.seat_preference || 'Desk',
      service: request.service || notesObj.service || 'Virtual Office',
      startDate: request.start_date || new Date().toISOString(),
      notes: request.notes,
      status: request.status,
      reviewedBy: request.reviewed_by,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      agreementStatus: currentStatus,
      agreementToken: request.agreement_token || notesObj.agreementToken,
      agreementTokenExpiresAt: tokenExpiresAt,
      agreementSentAt: request.agreement_sent_at || notesObj.agreementSentAt,
      agreementViewedAt: currentViewedAt,
      agreementSignedAt: request.agreement_signed_at || notesObj.agreementSignedAt,
      signatureImageUrl: request.signature_image_url || notesObj.signatureImageUrl,
      signedPdfUrl: request.signed_pdf_url || notesObj.signedPdfUrl,
      emailSentAt: request.email_sent_at || notesObj.emailSentAt,
      resendCount: request.resend_count ?? notesObj.resendCount ?? 0,
    };

    const agreementData = prepareAgreementData(mappedRequest);

    // If agreement status is 'Sent', update to 'Viewed'
    if (currentStatus === 'Sent' || !currentViewedAt) {
      const viewedAt = new Date().toISOString();
      const updatedNotes = {
        ...notesObj,
        agreementStatus: 'Viewed',
        agreementViewedAt: viewedAt,
      };

      let updatePayload: any = {
        agreement_status: 'Viewed',
        agreement_viewed_at: viewedAt,
        notes: JSON.stringify(updatedNotes),
      };

      let { error: updateErr } = await supabase
        .from('onboarding_requests')
        .update(updatePayload)
        .eq('id', request.id);

      if (updateErr) {
        delete updatePayload.agreement_status;
        delete updatePayload.agreement_viewed_at;
        await supabase.from('onboarding_requests').update(updatePayload).eq('id', request.id);
      }

      // Log activity
      try {
        await supabase.from('onboarding_activity_logs').insert({
          request_id: request.id,
          action: 'Agreement Viewed',
          details: `Client viewed agreement on ${new Date(viewedAt).toLocaleString()}`,
        });
      } catch (err) {}
    }

    return {
      success: true,
      request: mappedRequest,
      agreementData,
      htmlContent: renderAgreementHtml(agreementData),
    };
  } catch (err: any) {
    console.error('Error verifying agreement token:', err);
    return { success: false, error: err.message || 'Verification error' };
  }
}

/**
 * Submit client digital signature, generate final signed PDF, and notify via Resend
 */
export async function submitSignedAgreementAction(token: string, signatureDataUrl: string) {
  try {
    const supabase = getAdminSupabase();
    const request = await findRequestByToken(supabase, token);

    if (!request) {
      return { success: false, error: 'Invalid signing token.' };
    }

    let notesObj: any = {};
    if (request.notes) {
      try { notesObj = JSON.parse(request.notes); } catch (e) {}
    }

    const currentStatus = request.agreement_status || notesObj.agreementStatus || 'Pending';
    if (currentStatus === 'Signed') {
      return { success: false, error: 'This agreement has already been executed and signed.' };
    }

    const companyName = notesObj.companyName || request.full_name || 'Company';
    const clientName = request.full_name || 'Client';
    const clientEmail = request.email;

    // 2. Upload Signature PNG to Supabase Storage
    const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const sigBuffer = Buffer.from(base64Data, 'base64');
    const sigFileName = `signatures/${request.id.slice(0, 8)}_${Date.now()}_signature.png`;

    const { error: sigUploadErr } = await supabase.storage
      .from('agreements')
      .upload(sigFileName, sigBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (sigUploadErr) {
      console.error('Error uploading signature to storage:', sigUploadErr.message);
    }

    const { data: { publicUrl: signatureImageUrl } } = supabase.storage
      .from('agreements')
      .getPublicUrl(sigFileName);

    // 3. Prepare complete agreement data with signature
    const mappedRequest: any = {
      id: request.id,
      fullName: request.full_name,
      email: request.email,
      phone: request.phone,
      seatPreference: request.seat_preference || 'Desk',
      service: request.service || 'Virtual Office',
      startDate: request.start_date || new Date().toISOString(),
      notes: request.notes,
      status: request.status,
      signatureImageUrl: signatureDataUrl || signatureImageUrl,
      agreementSignedAt: new Date().toISOString(),
    };

    const agreementData = prepareAgreementData(mappedRequest);

    // 4. Generate signed PDF binary buffer
    const pdfBuffer = await generateSignedAgreementPdfBuffer(agreementData);
    const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const pdfFileName = `signed/${sanitizedCompanyName}_VO.pdf`;

    const { error: pdfUploadErr } = await supabase.storage
      .from('agreements')
      .upload(pdfFileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (pdfUploadErr) {
      console.error('Error uploading signed PDF to storage:', pdfUploadErr.message);
    }

    const { data: { publicUrl: signedPdfUrl } } = supabase.storage
      .from('agreements')
      .getPublicUrl(pdfFileName);

    // 5. Update DB record to lock agreement
    const signedAt = new Date().toISOString();
    const updatedNotes = {
      ...notesObj,
      agreementStatus: 'Signed',
      signatureImageUrl,
      signedPdfUrl,
    };

    let updatePayload: any = {
      agreement_status: 'Signed',
      agreement_signed_at: signedAt,
      signature_image_url: signatureImageUrl,
      signed_pdf_url: signedPdfUrl,
      notes: JSON.stringify(updatedNotes),
    };

    let { error: updateErr } = await supabase
      .from('onboarding_requests')
      .update(updatePayload)
      .eq('id', request.id);

    if (updateErr) {
      delete updatePayload.agreement_status;
      delete updatePayload.agreement_signed_at;
      delete updatePayload.signature_image_url;
      delete updatePayload.signed_pdf_url;
      await supabase.from('onboarding_requests').update(updatePayload).eq('id', request.id);
    }

    // 6. Log activities
    try {
      await supabase.from('onboarding_activity_logs').insert([
        { request_id: request.id, action: 'Signature Submitted', details: `Client drawn signature saved to storage` },
        { request_id: request.id, action: 'PDF Generated', details: `Final signed PDF generated: ${pdfFileName}` },
      ]);
    } catch (err) {
      // Ignore log error
    }

    // 7. Dispatch emails via Resend
    await sendSignedAgreementEmails({
      clientEmail,
      clientName,
      companyName,
      signedPdfUrl,
      signedAt,
    });

    try {
      await supabase.from('onboarding_activity_logs').insert({
        request_id: request.id,
        action: 'Email Delivered',
        details: `Executed PDF sent to ${clientEmail} and Admin notification dispatched.`,
      });
    } catch (err) {}

    return {
      success: true,
      signedPdfUrl,
      companyName,
    };
  } catch (err: any) {
    console.error('Error in submitSignedAgreementAction:', err);
    return { success: false, error: err.message || 'Failed processing agreement submission.' };
  }
}

/**
 * Update application fields (Admin Edit)
 */
export async function updateOnboardingDetailsAction(requestId: string, fields: any) {
  try {
    const supabase = getAdminSupabase();
    const { data: request, error: fetchErr } = await supabase
      .from('onboarding_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchErr || !request) return { success: false, error: 'Request not found' };

    let notesObj: any = {};
    if (request.notes) {
      try { notesObj = JSON.parse(request.notes); } catch (e) {}
    }

    const updatedNotes = {
      ...notesObj,
      companyName: fields.companyName ?? notesObj.companyName,
      plan: fields.plan ?? notesObj.plan,
      natureOfBusiness: fields.natureOfBusiness ?? notesObj.natureOfBusiness,
      gstin: fields.gstin ?? notesObj.gstin,
      address: fields.address ?? notesObj.address,
      virtualSuiteNo: fields.virtualSuiteNo ?? notesObj.virtualSuiteNo,
    };

    await supabase
      .from('onboarding_requests')
      .update({
        full_name: fields.companyName || request.full_name,
        email: fields.email || request.email,
        phone: fields.phone || request.phone,
        notes: JSON.stringify(updatedNotes),
      })
      .eq('id', requestId);

    try {
      await supabase.from('onboarding_activity_logs').insert({
        request_id: requestId,
        action: 'Application Details Updated',
        details: `Admin updated fields for ${fields.companyName || request.full_name}`,
      });
    } catch (e) {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Resend Virtual Office Agreement (Invalidate previous token, regenerate, send email)
 */
export async function resendAgreementAction(requestId: string) {
  try {
    const supabase = getAdminSupabase();
    const { data: request, error: fetchErr } = await supabase
      .from('onboarding_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchErr || !request) return { success: false, error: 'Request not found' };

    let notesObj: any = {};
    if (request.notes) {
      try { notesObj = JSON.parse(request.notes); } catch (e) {}
    }

    const newToken = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const sentAt = new Date().toISOString();
    const newResendCount = (request.resend_count || notesObj.resendCount || 0) + 1;

    const updatedNotes = {
      ...notesObj,
      agreementStatus: 'Sent',
      agreementToken: newToken,
      agreementTokenExpiresAt: tokenExpiresAt,
      agreementSentAt: sentAt,
      resendCount: newResendCount,
    };

    await supabase
      .from('onboarding_requests')
      .update({
        agreement_status: 'Sent',
        agreement_token: newToken,
        agreement_token_expires_at: tokenExpiresAt,
        agreement_sent_at: sentAt,
        email_sent_at: sentAt,
        resend_count: newResendCount,
        notes: JSON.stringify(updatedNotes),
      })
      .eq('id', requestId);

    const { sendAgreementReviewEmail } = await import('@/lib/email/email-service');
    const companyName = notesObj.companyName || request.full_name;
    const clientEmail = request.email;

    await sendAgreementReviewEmail({
      clientEmail,
      clientName: companyName,
      companyName,
      token: newToken,
      expiresAt: tokenExpiresAt,
    });

    try {
      await supabase.from('onboarding_activity_logs').insert({
        request_id: requestId,
        action: 'Agreement Resent',
        details: `Invalidated previous signing token. Sent new agreement link to ${clientEmail} (Resend #${newResendCount})`,
      });
    } catch (e) {}

    return { success: true, token: newToken };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
