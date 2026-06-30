import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Handle both sync operations and quote submissions
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['owner', 'technician'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  // Handle quote submission
  if (body.quote) {
    const { customer_name, customer_email, customer_phone, description } = body.quote;
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        customer_name,
        customer_email,
        customer_phone,
        description,
        status: 'pending',
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ quote }, { status: 201 });
  }

  // Handle sync operation
  const { table_name, operation, payload, id } = body;
  const table = table_name;

  if (!['customers', 'materials', 'job_cards', 'job_materials', 'time_logs', 'sync_queue', 'quotes', 'communications', 'invoices', 'staff_schedule'].includes(table)) {
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
}