import { z } from 'zod';

export const membershipSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  phone: z.string().min(10, { message: 'Phone number must be at least 10 characters.' }),
  emergencyContact: z.string().min(10, { message: 'Emergency contact number must be at least 10 characters.' }),
  address: z.string().min(5, { message: 'Address must be at least 5 characters.' }),
  seatPreference: z.enum(['coworking', 'study', 'cabin'], {
    message: 'Please select a valid seat preference.',
  }),
  startDate: z.string().min(1, { message: 'Start date is required.' }),
  idProofType: z.enum(['Aadhar', 'Driving License', 'Other'], {
    message: 'Please select an ID proof type.',
  }),
  idProofUrl: z.string().min(1, { message: 'ID Proof document upload is required.' }),
  purposeType: z.enum(['Student', 'Working'], {
    message: 'Please select your purpose of use.',
  }),
  purposeDetails: z.string().min(2, { message: 'Purpose details are required.' }),
  notes: z.string().optional(),
});

export type MembershipInput = z.infer<typeof membershipSchema>;

export const virtualOfficeSchema = z.object({
  startDate: z.string().min(1, { message: 'Date is required.' }),
  plan: z.enum(['Silver', 'Gold'], { message: 'Please select a plan.' }),
  companyName: z.string().min(2, { message: 'Company name must be at least 2 characters.' }),
  natureOfBusiness: z.string().min(1, { message: 'Please select nature of business.' }),
  natureOfBusinessOther: z.string().optional(),
  email1: z.string().email({ message: 'Invalid email address for Email 1.' }),
  email2: z.string().email({ message: 'Invalid email address for Email 2.' }).optional().or(z.literal('')),
  companyLogoUrl: z.string().optional(),
  gstin: z.string().optional(),
  stampPaper: z.enum(['₹100', '₹200', '₹500'], { message: 'Please select stamp paper amount.' }),
  reasonForVo: z.enum(['GST Registration', 'ROC / Company Incorporation', 'Bank Account Opening', 'Business Address for Marketing', 'Other'], {
    message: 'Please select reason for Virtual Office.',
  }),
  reasonForVoOther: z.string().optional(),
  biggestChallenge: z.string().min(5, { message: 'Please share your biggest challenge (at least 5 characters).' }),
  currentProblem: z.string().min(5, { message: 'Please share the specific problem you are solving (at least 5 characters).' }),
  consultantHandling: z.enum(['Yes', 'No', 'Self-managing'], { message: 'Please select consultant status.' }),
  hearAboutUs: z.enum(['Facebook / Instagram', 'YouTube', 'Google', 'Friend / Referral', 'Other'], { message: 'Please select how you heard about us.' }),
  hearAboutUsOther: z.string().optional(),
  tentativeCompletionDate: z.string().min(1, { message: 'Tentative completion date is required.' }),
}).refine((data) => {
  if (data.natureOfBusiness === 'Other' && (!data.natureOfBusinessOther || data.natureOfBusinessOther.trim().length < 2)) {
    return false;
  }
  return true;
}, {
  message: 'Please specify your business.',
  path: ['natureOfBusinessOther'],
}).refine((data) => {
  if (data.reasonForVo === 'Other' && (!data.reasonForVoOther || data.reasonForVoOther.trim().length < 2)) {
    return false;
  }
  return true;
}, {
  message: 'Please specify your reason.',
  path: ['reasonForVoOther'],
}).refine((data) => {
  if (data.hearAboutUs === 'Other' && (!data.hearAboutUsOther || data.hearAboutUsOther.trim().length < 2)) {
    return false;
  }
  return true;
}, {
  message: 'Please specify how you heard about us.',
  path: ['hearAboutUsOther'],
});

export type VirtualOfficeInput = z.infer<typeof virtualOfficeSchema>;


export const supportRequestSchema = z.object({
  clientMobile: z.string().min(10, { message: 'Mobile number must be at least 10 digits.' }),
  clientId: z.string().uuid({ message: 'Invalid client selection.' }).optional().nullable(),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  seatNumber: z.string().min(1, { message: 'Seat or cabin number is required.' }),
  category: z.enum(['suggestion', 'enquiry', 'complaint', 'plan_change', 'vacate', 'other'], {
    message: 'Please select a valid category.',
  }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  imageUrl: z.string().optional().nullable(),
  expectedVacateDate: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high'], {
    message: 'Please select a valid priority.',
  }),
});

export type SupportRequestInput = z.infer<typeof supportRequestSchema>;

export const vacateNoticeSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  seatNumber: z.string().min(1, { message: 'Seat or cabin number is required.' }),
  vacateDate: z.string().min(1, { message: 'Vacate date is required.' }),
  reason: z.string().optional(),
});

export type VacateNoticeInput = z.infer<typeof vacateNoticeSchema>;

export const seatSchema = z.object({
  name: z.string().min(1, { message: 'Seat name is required.' }),
  type: z.enum(['coworking', 'study', 'cabin']),
  status: z.enum(['available', 'occupied', 'vacating']),
  zoneId: z.string().min(1, { message: 'Zone ID is required.' }),
  layoutId: z.string().uuid().nullable().optional(),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export type SeatInput = z.infer<typeof seatSchema>;
