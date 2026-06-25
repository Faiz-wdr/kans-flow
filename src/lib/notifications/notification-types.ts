import type { UserRole } from '@/types';

export type RichNotificationType =
  | 'membership_submitted'
  | 'membership_approved'
  | 'membership_rejected'
  | 'support_submitted'
  | 'support_assigned'
  | 'support_resolved'
  | 'seat_assigned'
  | 'seat_vacating'
  | 'seat_released'
  | 'announcement'
  | 'general';

export type RecipientType =
  | { type: 'admin' }
  | { type: 'staff' }
  | { type: 'admin_staff' }
  | { type: 'individual'; userId: string };

export type NotificationPriority = 'high' | 'medium' | 'low';

export type ReferenceModule = 'membership' | 'support' | 'seat' | 'announcement' | 'general';

export interface CreateNotificationPayload {
  organizationId: string;
  type: RichNotificationType;
  recipient: RecipientType;
  title: string;
  body: string;
  referenceModule: ReferenceModule;
  referenceId?: string;
  priority?: NotificationPriority;
  actorId?: string;
}
