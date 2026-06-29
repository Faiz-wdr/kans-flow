// =============================================================================
// DATABASE ENUMS TYPE DEFINITIONS
// =============================================================================
export type UserRole = 'admin' | 'staff';
export type SeatType = 'coworking' | 'study' | 'cabin';
export type SeatStatus = 'available' | 'occupied' | 'vacating';
export type ClientStatus = 'onboarding' | 'active' | 'vacating' | 'archived';
export type OnboardingStatus = 'pending' | 'approved' | 'rejected';
export type SupportCategory = 'suggestion' | 'enquiry' | 'complaint' | 'plan_change' | 'vacate' | 'other';
export type SupportStatus = 'open' | 'in_progress' | 'waiting_for_member' | 'resolved';
export type VacateStatus = 'pending' | 'verified' | 'completed';
export type NotificationType = 'new_onboarding' | 'new_ticket' | 'vacate_notice' | 'announcement';

// =============================================================================
// DATABASE ENTITY INTERFACES
// =============================================================================

// 1. Organizations
export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sector {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

// 2. Staff Profiles
export interface StaffProfile {
  id: string;
  organizationId: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employeeId?: string;
  email?: string;
  mobileNumber?: string;
  jobTitle?: string;
  notes?: string;
  isDeleted: boolean;
  sectors?: Sector[];
}

// 3. Workspace Zones (Floors / Sections)
export interface WorkspaceZone {
  id: string;
  organizationId: string;
  name: string;
  floorNumber: number;
  createdAt: string;
}

// 4. Seat Layouts (Visual maps)
export interface SeatLayoutDimensions {
  width: number;
  height: number;
}

export interface SeatLayout {
  id: string;
  organizationId: string;
  zoneId: string;
  backgroundImageUrl: string | null;
  dimensions: SeatLayoutDimensions;
  createdAt: string;
  updatedAt: string;
}

// 5. Seats
export interface SeatCoordinates {
  x: number;
  y: number;
}

export interface Seat {
  id: string;
  organizationId: string;
  zoneId: string;
  layoutId: string | null;
  name: string;
  type: SeatType;
  status: SeatStatus;
  coordinates: SeatCoordinates;
  createdAt: string;
  updatedAt: string;
}

// 6. Clients
export interface Client {
  id: string;
  organizationId: string | null;
  fullName: string;
  email: string;
  phone: string;
  service?: string;
  status: ClientStatus;
  onboardedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 7. Client Documents
export interface ClientDocument {
  id: string;
  organizationId: string;
  clientId: string;
  name: string;
  filePath: string;
  uploadedAt: string;
}

// 8. Seat Assignments
export interface SeatAssignment {
  id: string;
  organizationId: string;
  clientId: string;
  seatId: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AgreementStatus = 'Pending' | 'Sent' | 'Viewed' | 'Signed';

export interface OnboardingActivityLog {
  id: string;
  requestId: string;
  action: string;
  details?: string | null;
  createdAt: string;
}

// 9. Onboarding Requests
export interface OnboardingRequest {
  id: string;
  organizationId: string | null;
  fullName: string;
  email: string;
  phone: string;
  seatPreference: SeatType;
  service?: 'Coworking' | 'Study Space' | 'Virtual Office' | 'Business Consulting' | 'Online Academy' | string;
  startDate: string;
  notes: string | null;
  status: OnboardingStatus;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;

  // Phase 10: Digital Agreement & E-Signature Workflow fields
  agreementStatus?: AgreementStatus;
  agreementToken?: string | null;
  agreementTokenExpiresAt?: string | null;
  agreementSentAt?: string | null;
  agreementViewedAt?: string | null;
  agreementSignedAt?: string | null;
  signatureImageUrl?: string | null;
  signedPdfUrl?: string | null;
  emailSentAt?: string | null;
  resendCount?: number;
}

// 10. Support Requests
export interface SupportRequest {
  id: string;
  organizationId: string | null;
  clientId: string | null;
  seatNumber: string;
  name: string;
  email: string;
  category: SupportCategory;
  subject: string;
  description: string;
  status: SupportStatus;
  assignedTo: string | null;
  imageUrl: string | null;
  priority: string;
  ticketNumber: string;
  resolvedAt: string | null;
  expectedVacateDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 11. Support Notes
export interface SupportNote {
  id: string;
  requestId: string;
  authorId: string;
  note: string;
  createdAt: string;
}

// 12. Vacate Requests
export interface VacateRequest {
  id: string;
  organizationId: string;
  clientId: string;
  seatId: string;
  noticeDate: string;
  expectedVacateDate: string;
  status: VacateStatus;
  checklistKeyReturned: boolean;
  checklistDuesCleared: boolean;
  checklistDeskInspected: boolean;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

// 13. Announcements
export interface Announcement {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  publishedBy: string | null;
  createdAt: string;
}

// 14. Notifications
export interface Notification {
  id: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  targetRole: UserRole | null;
  targetUserId: string | null;
  createdAt: string;
}

// 15. Activity Logs
export interface ActivityLog {
  id: string;
  organizationId: string | null;
  actorId: string | null;
  action: string;
  details: Record<string, any> | null;
  createdAt: string;
}
