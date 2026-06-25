import type { SupabaseClient } from '@supabase/supabase-js';
import { CreateNotificationPayload } from './notification-types';
import { mapRichTypeToDbEnum, generateActionUrl } from './notification-utils';

/**
 * Creates a notification record, determines recipients, fetches device tokens, and triggers FCM.
 */
export async function createNotification(
  supabase: SupabaseClient,
  payload: CreateNotificationPayload
) {
  try {
    const dbType = mapRichTypeToDbEnum(payload.type);
    const actionUrl = generateActionUrl(payload.referenceModule, payload.referenceId);

    const insertData: any = {
      organization_id: payload.organizationId,
      type: dbType,
      title: payload.title,
      message: payload.body,
      is_read: false,
    };

    // Map recipient type to database fields
    if (payload.recipient.type === 'admin') {
      insertData.target_role = 'admin';
    } else if (payload.recipient.type === 'staff') {
      insertData.target_role = 'staff';
    } else if (payload.recipient.type === 'individual') {
      insertData.target_user_id = payload.recipient.userId;
    }

    let insertedNotification: any = null;

    // 1. Create database notification record (defensive approach with fallback)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([
          {
            ...insertData,
            reference_module: payload.referenceModule,
            reference_id: payload.referenceId || null,
            action_url: actionUrl,
            priority: payload.priority || 'medium',
            rich_type: payload.type,
          },
        ])
        .select()
        .single();

      if (error) {
        if (error.code === '42703') {
          // Columns do not exist yet (migration not run), fall back to standard table structure
          console.warn('[Notification Service] Metadata columns missing in database. Falling back to basic notification insert.');
          const fallbackRes = await supabase
            .from('notifications')
            .insert([insertData])
            .select()
            .single();

          if (fallbackRes.error) throw fallbackRes.error;
          insertedNotification = fallbackRes.data;
        } else {
          throw error;
        }
      } else {
        insertedNotification = data;
      }
    } catch (dbErr) {
      console.error('[Notification Service] Failed to write to notifications table:', dbErr);
    }

    // Log the creation activity
    await logNotificationActivity(
      supabase,
      payload.organizationId,
      payload.actorId,
      'notification_created',
      {
        type: payload.type,
        recipient: payload.recipient,
        title: payload.title,
        notification_id: insertedNotification?.id || 'failed_to_write_db',
      }
    );

    // 2. Determine recipients and resolve user IDs
    let userIds: string[] = [];
    if (payload.recipient.type === 'individual') {
      userIds = [payload.recipient.userId];
    } else {
      // Query users based on target roles
      let query = supabase
        .from('staff_profiles')
        .select('id')
        .eq('organization_id', payload.organizationId)
        .eq('is_active', true);

      if (payload.recipient.type === 'admin') {
        query = query.eq('role', 'admin');
      } else if (payload.recipient.type === 'staff') {
        query = query.eq('role', 'staff');
      }

      const { data: staffList, error: staffErr } = await query;
      if (staffErr) {
        console.error('[Notification Service] Error resolving recipient user list:', staffErr);
      } else {
        userIds = (staffList || []).map((u) => u.id);
      }
    }

    if (userIds.length === 0) {
      console.log('[Notification Service] No recipient users resolved. Skipping push.');
      return insertedNotification;
    }

    // 3. Find recipient device tokens
    let tokens: string[] = [];
    try {
      const { data: tokenRows, error: tokenError } = await supabase
        .from('fcm_tokens')
        .select('token')
        .in('user_id', userIds);

      if (tokenError) {
        if (tokenError.code === 'PGRST205' || (tokenError as any).status === 404) {
          console.log('[Notification Service] fcm_tokens table not found in database. Skipping push delivery.');
        } else {
          console.error('[Notification Service] Error fetching recipient device tokens:', tokenError);
        }
      } else {
        tokens = (tokenRows || []).map((t) => t.token);
      }
    } catch (tokenErr) {
      console.error('[Notification Service] Failed to retrieve FCM tokens:', tokenErr);
    }

    // 4. Send FCM push notifications (Fast-path / fallback delivery)
    if (tokens.length > 0 && insertedNotification?.id) {
      if (typeof window === 'undefined') {
        try {
          const { sendPushNotificationBatch } = require('./sender');
          await sendPushNotificationBatch(supabase, insertedNotification.id, tokens, payload.title, payload.body, {
            actionUrl,
            referenceModule: payload.referenceModule,
            referenceId: payload.referenceId || '',
            priority: payload.priority || 'medium',
            richType: payload.type,
            notificationId: insertedNotification.id,
          });
        } catch (pushErr) {
          console.error('[Notification Service] Fallback push delivery failed:', pushErr);
        }
      }
    } else if (tokens.length > 0) {
      console.log('[Notification Service] No database notification ID resolved. Skipping fallback push.');
    } else {
      console.log('[Notification Service] No active device tokens found for recipients.');
    }

    return insertedNotification;
  } catch (err) {
    console.error('[Notification Service] Error in createNotification process:', err);
    return null;
  }
}

/**
 * Saves or updates an FCM token for a user.
 */
export async function saveFCMToken(supabase: SupabaseClient, userId: string, token: string) {
  try {
    const { data, error } = await supabase
      .from('fcm_tokens')
      .upsert(
        {
          user_id: userId,
          token: token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      )
      .select();

    if (error) {
      if (error.code === 'PGRST205' || (error as any).status === 404) {
        console.warn('[Notification Service] fcm_tokens table missing. Cannot save token.');
      } else {
        console.error('[Notification Service] Error saving device token:', error);
      }
      return null;
    }
    return data;
  } catch (err) {
    console.error('[Notification Service] Exception saving device token:', err);
    return null;
  }
}

/**
 * Logs a background action into the Supabase activity_logs table.
 */
async function logNotificationActivity(
  supabase: SupabaseClient,
  organizationId: string,
  actorId: string | undefined,
  action: string,
  details: any
) {
  try {
    await supabase.from('activity_logs').insert([
      {
        organization_id: organizationId,
        actor_id: actorId || null,
        action,
        details,
      },
    ]);
  } catch (err) {
    console.error('[Notification Service] Failed to write to activity_logs table:', err);
  }
}

/**
 * Reusable database wrappers.
 */

export async function markAsRead(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .select();

  if (error) console.error(`[Notification Service] Error marking notification ${id} as read:`, error);
  return { data, error };
}

export async function markAllAsRead(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('organization_id', organizationId)
    .eq('is_read', false)
    .select();

  if (error) console.error('[Notification Service] Error marking all notifications as read:', error);
  return { data, error };
}

export async function deleteNotification(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .select();

  if (error) console.error(`[Notification Service] Error deleting notification ${id}:`, error);
  return { data, error };
}

export async function getUnreadCount(
  supabase: SupabaseClient,
  organizationId: string,
  role: string,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_read', false)
    .or(`target_role.eq.${role},target_user_id.eq.${userId},and(target_role.is.null,target_user_id.is.null)`);

  if (error) {
    console.error('[Notification Service] Error getting unread notification count:', error);
    return 0;
  }
  return data?.length || 0;
}

export async function getNotifications(
  supabase: SupabaseClient,
  organizationId: string,
  role: string,
  userId: string,
  limit = 10
) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('organization_id', organizationId)
    .or(`target_role.eq.${role},target_user_id.eq.${userId},and(target_role.is.null,target_user_id.is.null)`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Notification Service] Error loading notifications:', error);
    return { data: null, error };
  }

  // Map database fields to standard CamelCase interface
  const mapped = (data || []).map((row: any) => ({
    id: row.id,
    organizationId: row.organization_id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    targetRole: row.target_role,
    targetUserId: row.target_user_id,
    createdAt: row.created_at,
    referenceModule: row.reference_module || null,
    referenceId: row.reference_id || null,
    actionUrl: row.action_url || null,
    priority: row.priority || 'medium',
    richType: row.rich_type || null,
  }));

  return { data: mapped, error: null };
}
