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
