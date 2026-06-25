import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotificationBatch } from '@/lib/notifications/sender';

/**
 * Creates a server-side Supabase client using the service role key to bypass RLS.
 * Falls back to the anon key if service role is not defined (e.g. in local development).
 */
function getServiceClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const url = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[Notification Webhook] SUPABASE_SERVICE_ROLE_KEY is not defined. Falling back to ANON key (RLS rules will apply).');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate the webhook request
    const secret = request.headers.get('x-webhook-secret');
    const configuredSecret = process.env.WEBHOOK_SECRET;
    
    if (configuredSecret && secret !== configuredSecret) {
      console.warn('[Notification Webhook] Unauthorized request received.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    console.log('[Notification Webhook] Received payload:', JSON.stringify(payload));

    // Ensure we only process INSERT events for notifications table
    if (payload.type !== 'INSERT' || payload.table !== 'notifications') {
      return NextResponse.json({ message: 'Skipped: Not a notification insert event.' }, { status: 200 });
    }

    const record = payload.record || payload.new;
    if (!record) {
      return NextResponse.json({ error: 'Missing record payload.' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Query database to get fresh status and prevent duplicate sends
    const { data: dbRecord, error: dbError } = await supabase
      .from('notifications')
      .select('push_delivery_status')
      .eq('id', record.id)
      .single();

    if (dbError) {
      console.error(`[Notification Webhook] Error fetching notification status for ${record.id}:`, dbError);
      return NextResponse.json({ error: 'Notification not found in database.' }, { status: 404 });
    }

    if (dbRecord && (dbRecord.push_delivery_status === 'sent' || dbRecord.push_delivery_status === 'failed')) {
      console.log(`[Notification Webhook] Notification ${record.id} already processed (status: ${dbRecord.push_delivery_status}). Skipping delivery.`);
      return NextResponse.json({ message: `Notification already processed with status: ${dbRecord.push_delivery_status}` }, { status: 200 });
    }

    // 2. Resolve target recipient user IDs
    let userIds: string[] = [];
    if (record.target_user_id) {
      userIds = [record.target_user_id];
    } else {
      // Query staff profiles based on role
      let query = supabase
        .from('staff_profiles')
        .select('id')
        .eq('organization_id', record.organization_id)
        .eq('is_active', true);

      if (record.target_role === 'admin') {
        query = query.eq('role', 'admin');
      } else if (record.target_role === 'staff') {
        query = query.eq('role', 'staff');
      }

      const { data: staffList, error: staffErr } = await query;
      if (staffErr) {
        console.error('[Notification Webhook] Failed to resolve staff list:', staffErr);
        return NextResponse.json({ error: 'Failed to resolve recipients' }, { status: 500 });
      }

      userIds = (staffList || []).map((u) => u.id);
    }

    if (userIds.length === 0) {
      console.log('[Notification Webhook] No active recipient users resolved.');
      return NextResponse.json({ message: 'No recipients resolved.' }, { status: 200 });
    }

    // 3. Retrieve registered FCM device tokens for resolved users
    const { data: tokenRows, error: tokenError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .in('user_id', userIds);

    if (tokenError) {
      console.error('[Notification Webhook] Failed to retrieve device tokens:', tokenError);
      return NextResponse.json({ error: 'Failed to retrieve device tokens' }, { status: 500 });
    }

    const tokens = (tokenRows || []).map((t) => t.token);
    if (tokens.length === 0) {
      console.log('[Notification Webhook] No active device tokens registered for recipients.');
      return NextResponse.json({ message: 'No device tokens registered.' }, { status: 200 });
    }

    // 4. Trigger backend push notification delivery batch
    const actionUrl = record.action_url || '/dashboard';
    const metadata = {
      actionUrl,
      referenceModule: record.reference_module || 'general',
      referenceId: record.reference_id || '',
      priority: record.priority || 'medium',
      richType: record.rich_type || record.type || 'general',
      notificationId: record.id,
    };

    console.log(`[Notification Webhook] Dispatching push to ${tokens.length} tokens for notification: ${record.id}`);
    const result = await sendPushNotificationBatch(
      supabase,
      record.id,
      tokens,
      record.title,
      record.message,
      metadata
    );

    return NextResponse.json({
      message: 'Push notification processed successfully.',
      attempted: tokens.length,
      success: result.successCount,
      failed: result.failureCount,
    }, { status: 200 });

  } catch (err: any) {
    console.error('[Notification Webhook] Exception occurred processing webhook:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
