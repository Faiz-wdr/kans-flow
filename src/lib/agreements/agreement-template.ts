import type { OnboardingRequest } from '@/types';

export interface AgreementData {
  companyName: string;
  applicantName: string;
  contactNumber: string;
  email: string;
  address: string;
  planName: string;
  planAmount: string;
  startDate: string;
  endDate: string;
  duration: string;
  gstin: string;
  natureOfBusiness: string;
  applicationRef: string;
  signatureImageUrl?: string | null;
  signedDate?: string | null;
}

/**
 * Format raw onboarding request data into structured AgreementData placeholders
 */
export function prepareAgreementData(request: OnboardingRequest): AgreementData {
  let notesObj: any = {};
  if (request.notes) {
    try {
      notesObj = JSON.parse(request.notes);
    } catch (e) {
      // Ignore non-json notes
    }
  }

  const companyName = notesObj.companyName || request.fullName || 'Company Name';
  const applicantName = request.fullName || 'Applicant Name';
  const contactNumber = request.phone || 'Contact Number';
  const email = request.email || 'Email Address';
  const address = notesObj.address || 'Registered Address';
  const planName = notesObj.plan || 'Gold Plan';
  const planAmount = planName.toLowerCase().includes('silver') ? '₹6,000' : '₹10,000';
  const duration = planName.toLowerCase().includes('silver') ? '1 Year (12 Months)' : '2 Years (24 Months)';
  
  const start = request.startDate ? new Date(request.startDate) : new Date();
  const startDateStr = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  
  const end = new Date(start);
  if (planName.toLowerCase().includes('silver')) {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 2);
  }
  const endDateStr = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const gstin = notesObj.gstin || 'Not Applicable / Pending';
  const natureOfBusiness = notesObj.natureOfBusiness || 'Business Consulting / Services';
  const applicationRef = `VO-${request.id.slice(0, 8).toUpperCase()}`;

  return {
    companyName,
    applicantName,
    contactNumber,
    email,
    address,
    planName,
    planAmount,
    startDate: startDateStr,
    endDate: endDateStr,
    duration,
    gstin,
    natureOfBusiness,
    applicationRef,
    signatureImageUrl: request.signatureImageUrl || null,
    signedDate: request.agreementSignedAt ? new Date(request.agreementSignedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
  };
}

/**
 * Render complete official Virtual Office Agreement HTML
 */
export function renderAgreementHtml(data: AgreementData, isPrintMode = false): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Virtual Office Agreement - ${data.companyName}</title>
      <style>
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #1e293b;
          line-height: 1.6;
          background-color: ${isPrintMode ? '#ffffff' : '#f8fafc'};
          margin: 0;
          padding: ${isPrintMode ? '0' : '20px'};
          font-size: 13px;
        }
        .paper {
          max-width: 800px;
          margin: 0 auto;
          background: #ffffff;
          padding: 40px 48px;
          border: ${isPrintMode ? 'none' : '1px solid #cbd5e1'};
          border-radius: ${isPrintMode ? '0' : '12px'};
          box-shadow: ${isPrintMode ? 'none' : '0 10px 25px -5px rgba(0,0,0,0.05)'};
        }
        .header-table {
          width: 100%;
          border-bottom: 2px solid #ea580c;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .logo-title {
          font-family: Georgia, serif;
          font-size: 24px;
          font-weight: bold;
          color: #ea580c;
          margin: 0;
        }
        .sub-title {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 4px 0 0 0;
        }
        .ref-badge {
          text-align: right;
          font-family: monospace;
          font-size: 12px;
          color: #334155;
        }
        h2 {
          text-align: center;
          font-size: 16px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #0f172a;
          margin: 24px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .summary-grid {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }
        .summary-grid td {
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          font-size: 12px;
        }
        .summary-label {
          font-weight: bold;
          color: #475569;
          width: 30%;
          background-color: #f1f5f9;
        }
        .summary-value {
          color: #0f172a;
          font-weight: 600;
        }
        .terms-title {
          font-size: 14px;
          font-weight: bold;
          color: #0f172a;
          margin-top: 20px;
          margin-bottom: 8px;
        }
        ol {
          padding-left: 20px;
          margin-bottom: 24px;
        }
        li {
          margin-bottom: 10px;
          text-align: justify;
          color: #334155;
        }
        .signatures-table {
          width: 100%;
          margin-top: 40px;
          border-collapse: collapse;
        }
        .signature-cell {
          width: 50%;
          vertical-align: top;
          padding: 16px;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          background-color: #fafafa;
        }
        .sig-title {
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 12px;
        }
        .sig-box {
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }
        .sig-box img {
          max-height: 80px;
          max-width: 200px;
          object-fit: contain;
        }
        .sig-placeholder {
          color: #94a3b8;
          font-style: italic;
          font-size: 12px;
        }
        .sig-name {
          font-weight: bold;
          color: #0f172a;
          font-size: 13px;
        }
        .sig-detail {
          font-size: 11px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="paper">
        <table class="header-table">
          <tr>
            <td>
              <div class="logo-title">KANs HUB</div>
              <div class="sub-title">Workspace Operations & Service Agreement</div>
            </td>
            <td class="ref-badge">
              <strong>Ref:</strong> ${data.applicationRef}<br>
              <strong>Date:</strong> ${data.startDate}
            </td>
          </tr>
        </table>

        <h2>Virtual Office Service Agreement</h2>

        <p>This Virtual Office Agreement ("Agreement") is entered into and made effective as of <strong>${data.startDate}</strong>, by and between <strong>KANs HUB Workspace Operations</strong> ("Provider") and the Applicant/Entity listed below ("Client").</p>

        <table class="summary-grid">
          <tr>
            <td class="summary-label">Company / Entity Name</td>
            <td class="summary-value">${data.companyName}</td>
          </tr>
          <tr>
            <td class="summary-label">Authorized Applicant</td>
            <td class="summary-value">${data.applicantName}</td>
          </tr>
          <tr>
            <td class="summary-label">Contact & Email</td>
            <td class="summary-value">${data.contactNumber} &bull; ${data.email}</td>
          </tr>
          <tr>
            <td class="summary-label">Registered Business Address</td>
            <td class="summary-value">${data.address}</td>
          </tr>
          <tr>
            <td class="summary-label">Selected Plan & Fee</td>
            <td class="summary-value">${data.planName} &bull; ${data.planAmount}</td>
          </tr>
          <tr>
            <td class="summary-label">Agreement Duration</td>
            <td class="summary-value">${data.duration} (${data.startDate} to ${data.endDate})</td>
          </tr>
          <tr>
            <td class="summary-label">GSTIN / Tax ID</td>
            <td class="summary-value">${data.gstin}</td>
          </tr>
          <tr>
            <td class="summary-label">Nature of Business</td>
            <td class="summary-value">${data.natureOfBusiness}</td>
          </tr>
        </table>

        <div class="terms-title">Terms & Conditions of Service</div>
        <ol>
          <li><strong>Virtual Address Usage:</strong> The Provider grants the Client the non-exclusive right to use the designated KANs HUB virtual office address for business registration, postal correspondence, and official compliance verification during the active term of this Agreement.</li>
          <li><strong>Mail & Parcel Handling:</strong> All incoming mail and packages addressed to the Client will be received at the reception. The Client will be promptly notified upon receipt of important notices or parcels.</li>
          <li><strong>Compliance & Legal Conduct:</strong> The Client agrees that the virtual office address shall be used strictly for lawful business activities in compliance with municipal, statutory, and tax authorities. Illegal activities will result in immediate termination of service and report to authorities.</li>
          <li><strong>Renewal & Fee Structure:</strong> Service fees are payable in full prior to the start of the subscription term (${data.planAmount} for ${data.duration}). Renewal notices will be issued 30 days prior to expiry (${data.endDate}).</li>
          <li><strong>Termination & Vacate Notice:</strong> Either party may terminate this Agreement by providing a 30-day written notice. Upon expiration or termination, the Client must immediately update statutory records to remove the Provider's address.</li>
        </ol>

        <table class="signatures-table">
          <tr>
            <td class="signature-cell" style="margin-right: 10px;">
              <div class="sig-title">For KANs HUB Operations</div>
              <div class="sig-box">
                <div style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #ea580c; border-bottom: 1px solid #ea580c; padding-bottom: 2px;">
                  KANs HUB Authorized Signatory
                </div>
              </div>
              <div class="sig-name">Authorized Management</div>
              <div class="sig-detail">KANs HUB Workspace Operations</div>
            </td>
            <td class="signature-cell">
              <div class="sig-title">Client Digital Signature</div>
              <div class="sig-box">
                ${data.signatureImageUrl ? `<img src="${data.signatureImageUrl}" alt="Client E-Signature" />` : `<div class="sig-placeholder">[ Pending Client E-Signature ]</div>`}
              </div>
              <div class="sig-name">${data.applicantName}</div>
              <div class="sig-detail">${data.companyName} &bull; ${data.signedDate ? `Signed on ${data.signedDate}` : 'Awaiting Execution'}</div>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
}
