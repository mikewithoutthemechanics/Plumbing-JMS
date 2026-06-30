import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { table_name, record_id, action, old_values, new_values, changed_by, ip_address } = body;

    if (!['profiles', 'customers', 'materials', 'job_cards', 'job_materials', 'time_logs', 'banking_details'].includes(table_name)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    if (!['INSERT', 'UPDATE', 'DELETE'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { error } = await supabase
      .from('audit_log')
      .insert({
        table_name,
        record_id,
        action,
        old_values: old_values || null,
        new_values: new_values || null,
        changed_by: changed_by || user.id,
        ip_address: ip_address || null,
      });

    if (error) {
      console.error('[Audit API] Insert failed:', error);
      return NextResponse.json({ error: 'Failed to log audit' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
