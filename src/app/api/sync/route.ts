import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: queueItems, error } = await supabase
    .from('sync_queue')
    .select('*')
    .order('timestamp', { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch sync queue' }, { status: 500 });
  }

  return NextResponse.json({ items: queueItems });
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['owner', 'technician'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { table_name, operation, payload, id } = body;
    const table = table_name;

    if (!['customers', 'materials', 'job_cards', 'job_materials', 'time_logs', 'sync_queue'].includes(table)) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }
    if (!['INSERT', 'UPDATE', 'DELETE'].includes(operation)) {
      return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }

    let result;
    if (operation === 'INSERT') {
      result = await supabase.from(table).insert(payload).select();
    } else if (operation === 'UPDATE') {
      result = await supabase.from(table).update(payload).eq('id', payload.id).select();
    } else {
      result = await supabase.from(table).delete().eq('id', payload.id);
    }

    if (result.error) {
      console.error('[Sync] Failed:', table, result.error);
      return NextResponse.json({ error: result.error.message, failed: true }, { status: 500 });
    }

    if (id) {
      await supabase.from('sync_queue').delete().eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
