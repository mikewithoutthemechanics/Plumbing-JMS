import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sendPushToMultiple, PushPayload } from '@/lib/notifications/push';

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userIds, payload, targetRoles } = body as {
      userIds?: string[];
      payload: PushPayload;
      targetRoles?: string[];
    };

    const supabase = await getSupabaseServerClient();

    let query = supabase.from('push_subscriptions').select('*');

    if (userIds?.length) {
      query = query.in('user_id', userIds);
    } else if (targetRoles?.length) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .in('role', targetRoles);
      const ids = users?.map(u => u.id) || [];
      query = query.in('user_id', ids);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('[Push Send] DB error:', error);
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    if (!subscriptions?.length) {
      return NextResponse.json({ sent: 0, failed: 0, expired: [] });
    }

    const pushSubscriptions = subscriptions.map(s => ({
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh, auth: s.auth },
    }));

    const result = await sendPushToMultiple(pushSubscriptions, payload);

    if (result.expired.length) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', result.expired);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Push Send] Error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await getSupabaseServerClient();
  const { count, error } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to count' }, { status: 500 });
  }

  return NextResponse.json({ subscriptions: count || 0 });
}