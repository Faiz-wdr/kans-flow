import { jsPDF } from 'jspdf';
import type { AgreementData } from './agreement-template';

/**
 * Generate binary PDF buffer for signed Virtual Office agreement
 */
export async function generateSignedAgreementPdfBuffer(data: AgreementData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(234, 88, 12); // #ea580c
  doc.text('KANs HUB', 14, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Workspace Operations & Service Agreement', 14, y + 6);

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Ref: ${data.applicationRef}`, pageWidth - 14, y, { align: 'right' });
  doc.text(`Date: ${data.startDate}`, pageWidth - 14, y + 5, { align: 'right' });

  y += 14;
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('VIRTUAL OFFICE SERVICE AGREEMENT', pageWidth / 2, y, { align: 'center' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const introText = `This Virtual Office Agreement ("Agreement") is made effective as of ${data.startDate}, by and between KANs HUB Workspace Operations ("Provider") and ${data.companyName} ("Client").`;
  const splitIntro = doc.splitTextToSize(introText, pageWidth - 28);
  doc.text(splitIntro, 14, y);
  y += splitIntro.length * 5 + 6;

  // Summary Table Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, y, pageWidth - 28, 52, 'FD');

  doc.setFontSize(9);
  const rowHeight = 6.5;
  let tableY = y + 6;

  const summaryRows = [
    ['Company Name:', data.companyName],
    ['Authorized Applicant:', data.applicantName],
    ['Contact & Email:', `${data.contactNumber}  |  ${data.email}`],
    ['Registered Address:', data.address],
    ['Plan & Fee:', `${data.planName} (${data.planAmount})`],
    ['Duration:', `${data.duration} (${data.startDate} to ${data.endDate})`],
    ['GSTIN & Business:', `GSTIN: ${data.gstin}  |  ${data.natureOfBusiness}`],
  ];

  for (const [label, val] of summaryRows) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(label, 18, tableY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const truncatedVal = val.length > 60 ? val.substring(0, 57) + '...' : val;
    doc.text(truncatedVal, 65, tableY);
    tableY += rowHeight;
  }

  y += 60;

  // Terms & Conditions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Terms & Conditions of Service', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);

  const terms = [
    '1. Virtual Address Usage: The Provider grants the Client the non-exclusive right to use the designated KANs HUB virtual office address for business registration and official compliance during the active term.',
    '2. Mail & Parcel Handling: All incoming mail and packages addressed to the Client will be received at reception and notified promptly via portal or communication channels.',
    '3. Legal Conduct: The Client agrees that the address shall be used strictly for lawful business activities in compliance with municipal and tax authorities.',
    '4. Fee Structure: Service fees are payable in full prior to subscription activation. Renewal notices will be issued 30 days prior to expiry.',
    '5. Termination & Vacate Notice: Either party may terminate by providing a 30-day written notice. Upon termination, Client must update statutory records immediately.',
  ];

  for (const term of terms) {
    const splitTerm = doc.splitTextToSize(term, pageWidth - 28);
    doc.text(splitTerm, 14, y);
    y += splitTerm.length * 4.5 + 2.5;
  }

  y += 10;

  // Signatures Box
  const sigBoxWidth = (pageWidth - 34) / 2;
  const sigBoxHeight = 45;

  // Provider Signature Box
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.rect(14, y, sigBoxWidth, sigBoxHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('FOR KANS HUB OPERATIONS', 18, y + 6);

  doc.setFont('georgia', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(234, 88, 12);
  doc.text('KANs HUB Authorized', 18, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Management', 18, y + 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('KANs HUB Workspace Operations', 18, y + 41);

  // Client Signature Box
  const clientSigX = 14 + sigBoxWidth + 6;
  doc.rect(clientSigX, y, sigBoxWidth, sigBoxHeight, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CLIENT DIGITAL SIGNATURE', clientSigX + 4, y + 6);

  if (data.signatureImageUrl) {
    try {
      let imgData = data.signatureImageUrl;
      if (imgData.startsWith('http://') || imgData.startsWith('https://')) {
        const res = await fetch(imgData);
        const buffer = await res.arrayBuffer();
        imgData = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
      }
      doc.addImage(imgData, 'PNG', clientSigX + 4, y + 10, sigBoxWidth - 8, 20);
    } catch (e) {
      console.error('Error rendering signature in PDF:', e);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text('[ Digitally Signed ]', clientSigX + 4, y + 20);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('[ Pending E-Signature ]', clientSigX + 4, y + 20);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(data.applicantName, clientSigX + 4, y + 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${data.companyName} | ${data.signedDate ? `Signed ${data.signedDate}` : 'Awaiting Execution'}`, clientSigX + 4, y + 41);

  // Reset line dash
  doc.setLineDashPattern([], 0);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
