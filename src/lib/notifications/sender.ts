import type { SupabaseClient } from '@supabase/supabase-js';
import { getFirebaseAdminMessaging } from './admin';

/**
 * Updates the push delivery status and error details in the notifications table.
 */
async function updateDeliveryStatus(
  supabase: SupabaseClient,
  notificationId: string,
  status: 'pending' | 'sent' | 'failed',
  errorMsg: string | null
) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        push_delivery_status: status,
        push_delivery_error: errorMsg,
      })
      .eq('id', notificationId);

    if (error) {
      console.error(`[Notification Sender] Failed to update delivery status for notification ${notificationId}:`, error);
    }
  } catch (err) {
    console.error(`[Notification Sender] Exception updating delivery status for notification ${notificationId}:`, err);
  }
}

/**
 * Logs push notification delivery events into the Supabase activity_logs table.
 */
async function logNotificationActivity(
  supabase: SupabaseClient,
  organizationId: string | null,
  actorId: string | null,
  action: string,
  details: any
) {
  try {
    await supabase.from('activity_logs').insert([
      {
        organization_id: organizationId,
        actor_id: actorId,
        action,
        details,
      },
    ]);
  } catch (err) {
    console.error('[Notification Sender] Failed to log activity:', err);
  }
}

/**
 * Delivers a push notification to multiple device tokens in batch.
 * Updates the notification delivery status and prunes expired tokens.
 */
export async function sendPushNotificationBatch(
  supabase: SupabaseClient,
  notificationId: string | null,
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>
) {
  if (tokens.length === 0) {
    console.log('[Notification Sender] No device tokens provided. Skipping push.');
    if (notificationId) {
      await updateDeliveryStatus(supabase, notificationId, 'sent', null);
    }
    return { successCount: 0, failureCount: 0 };
  }

  const messaging = getFirebaseAdminMessaging();
  if (!messaging) {
    const errorMsg = 'Firebase Admin Messaging is not initialized. Server credentials missing.';
    console.warn(`[Notification Sender] ${errorMsg}`);
    if (notificationId) {
      await updateDeliveryStatus(supabase, notificationId, 'failed', errorMsg);
    }
    return { successCount: 0, failureCount: tokens.length };
  }

  const payload = {
    tokens,
    notification: {
      title,
      body,
    },
    data,
  };

  let successCount = 0;
  let failureCount = 0;
  const failedTokensToDelete: string[] = [];
  const errors: string[] = [];

  try {
    console.log(`[Notification Sender] Triggering multicast sending to ${tokens.length} tokens...`);
    const response = await messaging.sendEachForMulticast(payload);

    response.responses.forEach((resp: any, idx: number) => {
      const token = tokens[idx];
      if (resp.success) {
        successCount++;
      } else {
        failureCount++;
        const err = resp.error;
        const errMessage = err?.message || 'Unknown FCM error';
        errors.push(`Token ${token.substring(0, 10)}... error: ${errMessage}`);

        // Identify expired or invalid registration tokens for cleanup
        if (
          err?.code === 'messaging/invalid-registration-token' ||
          err?.code === 'messaging/registration-token-not-registered'
        ) {
          failedTokensToDelete.push(token);
        }
      }
    });

    // Prune invalid tokens from DB
    if (failedTokensToDelete.length > 0) {
      console.log(`[Notification Sender] Pruning ${failedTokensToDelete.length} invalid/expired tokens.`);
      try {
        await supabase.from('fcm_tokens').delete().in('token', failedTokensToDelete);
      } catch (dbErr) {
        console.error('[Notification Sender] Error deleting expired tokens:', dbErr);
      }
    }

    // Update status in notifications table
    if (notificationId) {
      const finalStatus = failureCount === tokens.length ? 'failed' : 'sent';
      const finalError = errors.length > 0 ? errors.join('; ') : null;
      await updateDeliveryStatus(supabase, notificationId, finalStatus, finalError);
    }

    // Log the multicast activity results
    await logNotificationActivity(
      supabase,
      null,
      null,
      failureCount > 0 && successCount === 0 ? 'push_failed' : 'push_delivered',
      {
        notification_id: notificationId,
        attempted_count: tokens.length,
        success_count: successCount,
        failure_count: failureCount,
        pruned_count: failedTokensToDelete.length,
        errors: errors.length > 0 ? errors : undefined,
      }
    );

    return { successCount, failureCount };
  } catch (err: any) {
    console.error('[Notification Sender] Multicast delivery request exception:', err);
    if (notificationId) {
      await updateDeliveryStatus(supabase, notificationId, 'failed', err.message);
    }
    return { successCount: 0, failureCount: tokens.length };
  }
}
