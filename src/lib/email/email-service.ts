import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.includes('your_resend_api_key')) return null;
  return new Resend(apiKey);
}

const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || 'KANs Flow <onboarding@resend.dev>';
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@kanshub.com';

/**
 * Send Agreement Review email to client with secure signing link
 */
export async function sendAgreementReviewEmail(params: {
  clientEmail: string;
  clientName: string;
  companyName: string;
  token: string;
  expiresAt: string;
}) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const signUrl = `${baseUrl}/agreement/sign/${params.token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #111827; margin: 0; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .logo { font-family: Georgia, serif; font-size: 20px; font-weight: bold; color: #ea580c; margin-bottom: 24px; display: inline-block; }
        .badge { background-color: #ffedd5; color: #c2410c; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        h1 { font-size: 20px; font-weight: 800; margin-top: 16px; margin-bottom: 8px; color: #0f172a; }
        p { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
        .details-box { background-color: #f8fafc; border-left: 4px solid #ea580c; border-radius: 4px; padding: 16px; margin-bottom: 24px; font-size: 13px; }
        .details-box p { margin: 4px 0; color: #334155; }
        .btn { display: inline-block; background-color: #ea580c; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 8px; text-align: center; margin: 12px 0 24px 0; box-shadow: 0 2px 4px rgba(234, 88, 12, 0.2); }
        .footer { border-top: 1px solid #f1f5f9; pt: 20px; margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">KANs Flow <span class="badge">Virtual Office</span></div>
        <h1>Virtual Office Agreement – KANs HUB</h1>
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>Thank you for submitting your Virtual Office application for <strong>${params.companyName}</strong>. Your onboarding details have been verified and your official agreement is ready for digital execution.</p>
        
        <div class="details-box">
          <p><strong>Company Name:</strong> ${params.companyName}</p>
          <p><strong>Applicant:</strong> ${params.clientName}</p>
          <p><strong>Status:</strong> Awaiting Digital E-Signature</p>
        </div>

        <p>Please click the secure button below to review your complete agreement and provide your digital signature:</p>
        
        <div style="text-align: center;">
          <a href="${signUrl}" class="btn" target="_blank">Review & Sign Agreement</a>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center;">Or copy this secure link into your browser:<br><a href="${signUrl}" style="color: #ea580c;">${signUrl}</a></p>
        
        <div class="footer">
          <p>This email and link are intended solely for ${params.clientName}. If you have questions, please contact KANs HUB Support.</p>
          <p>&copy; ${new Date().getFullYear()} KANs HUB. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const resend = getResendClient();
  if (!resend) {
    console.log(`[EmailService Simulated] RESEND_API_KEY is not set. Skipped sending email to ${params.clientEmail}. Signing URL: ${signUrl}`);
    return { success: true, simulated: true, signUrl };
  }

  try {
    let response = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [params.clientEmail],
      subject: 'Virtual Office Agreement – KANs HUB',
      html,
    });

    if (response.error) {
      console.warn('[EmailService Warning] Resend send error:', response.error.message);
      if (response.error.message.includes('only send testing emails')) {
        console.log('[EmailService Fallback] Rerouting testing email to account owner (xiongdidesigns@gmail.com)...');
        response = await resend.emails.send({
          from: SENDER_EMAIL,
          to: ['xiongdidesigns@gmail.com'],
          subject: `[TEST REDIRECT to ${params.clientEmail}] Virtual Office Agreement – KANs HUB`,
          html,
        });
      }
    }

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Error sending agreement email via Resend:', error);
    return { success: false, error: error.message || 'Failed sending email' };
  }
}

/**
 * Send Signed Agreement PDF to Client & Admin Notification after execution
 */
export async function sendSignedAgreementEmails(params: {
  clientEmail: string;
  clientName: string;
  companyName: string;
  signedPdfUrl: string;
  signedAt: string;
}) {
  const clientHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; color: #111827; margin: 0; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; }
        .logo { font-family: Georgia, serif; font-size: 20px; font-weight: bold; color: #10b981; }
        h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 16px; }
        p { font-size: 14px; line-height: 1.6; color: #475569; }
        .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">KANs Flow ✓</div>
        <h1>Signed Virtual Office Agreement</h1>
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>Congratulations! Your Virtual Office Agreement for <strong>${params.companyName}</strong> has been successfully executed and digitally signed on <strong>${new Date(params.signedAt).toLocaleDateString()}</strong>.</p>
        <p>You can access and download your official signed agreement PDF at any time using the link below:</p>
        <div style="text-align: center;">
          <a href="${params.signedPdfUrl}" class="btn" target="_blank">Download Signed Agreement PDF</a>
        </div>
      </div>
    </body>
    </html>
  `;

  const adminHtml = `
    <!DOCTYPE html>
    <html>
    <body>
      <h2>Virtual Office Agreement Signed Notice</h2>
      <p>A Virtual Office agreement has been digitally executed by the client.</p>
      <ul>
        <li><strong>Company Name:</strong> ${params.companyName}</li>
        <li><strong>Client Name:</strong> ${params.clientName}</li>
        <li><strong>Signed Date:</strong> ${new Date(params.signedAt).toLocaleString()}</li>
      </ul>
      <p><a href="${params.signedPdfUrl}" target="_blank">View / Download Signed PDF</a></p>
    </body>
    </html>
  `;

  const resend = getResendClient();
  if (!resend) {
    console.log(`[EmailService Simulated] Signed agreement emails simulated for ${params.companyName}. PDF: ${params.signedPdfUrl}`);
    return { success: true, simulated: true };
  }

  try {
    // Send to Client
    let resClient = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [params.clientEmail],
      subject: `Executed Agreement - ${params.companyName} Virtual Office`,
      html: clientHtml,
    });

    if (resClient.error && resClient.error.message.includes('only send testing emails')) {
      resClient = await resend.emails.send({
        from: SENDER_EMAIL,
        to: ['xiongdidesigns@gmail.com'],
        subject: `[TEST REDIRECT to ${params.clientEmail}] Executed Agreement - ${params.companyName} Virtual Office`,
        html: clientHtml,
      });
    }

    // Send to Admin
    let resAdmin = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [ADMIN_NOTIFICATION_EMAIL],
      subject: `[ADMIN ALERT] Agreement Signed: ${params.companyName}`,
      html: adminHtml,
    });

    if (resAdmin.error && resAdmin.error.message.includes('only send testing emails')) {
      resAdmin = await resend.emails.send({
        from: SENDER_EMAIL,
        to: ['xiongdidesigns@gmail.com'],
        subject: `[TEST REDIRECT to ADMIN] Agreement Signed: ${params.companyName}`,
        html: adminHtml,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending signed agreement emails via Resend:', error);
    return { success: false, error: error.message };
  }
}
