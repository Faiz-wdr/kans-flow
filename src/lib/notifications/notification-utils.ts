import { RichNotificationType, ReferenceModule } from './notification-types';
import type { NotificationType } from '@/types';

/**
 * Maps rich application-level notification types to the database enum values.
 */
export function mapRichTypeToDbEnum(type: RichNotificationType): NotificationType {
  switch (type) {
    case 'membership_submitted':
    case 'membership_approved':
    case 'membership_rejected':
      return 'new_onboarding';
    case 'support_submitted':
    case 'support_assigned':
    case 'support_resolved':
      return 'new_ticket';
    case 'seat_vacating':
    case 'seat_released':
      return 'vacate_notice';
    case 'seat_assigned':
    case 'announcement':
    case 'general':
    default:
      return 'announcement';
  }
}

/**
 * Generates the deep link action URL based on the reference module and ID.
 */
export function generateActionUrl(module: ReferenceModule, referenceId?: string): string {
  switch (module) {
    case 'membership':
    case 'virtual_office':
      return '/dashboard/clients?tab=onboarding';
    case 'support':
      return referenceId ? `/dashboard/support?id=${referenceId}` : '/dashboard/support';
    case 'seat':
      return '/dashboard/seats';
    case 'announcement':
      return '/dashboard/announcements';
    case 'general':
    default:
      return '/dashboard';
  }
}
