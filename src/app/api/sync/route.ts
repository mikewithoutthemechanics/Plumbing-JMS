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

  // Handle quote submission - owners only
  if (body.quote) {
    if (profile.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: only owners can submit quotes' }, { status: 403 });
    }
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

  // Validate table and operation
  const allowedTables = ['customers', 'materials', 'job_cards', 'job_materials', 'time_logs', 'sync_queue', 'quotes', 'communications', 'invoices', 'staff_schedule'];
  if (!allowedTables.includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
  }
  if (!['INSERT', 'UPDATE', 'DELETE'].includes(operation)) {
    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
  }

  // Role-based table access control
  const technicianAllowedTables = ['time_logs', 'job_materials'];
  if (profile.role === 'technician' && !technicianAllowedTables.includes(table)) {
    return NextResponse.json({ error: 'Forbidden: technicians can only sync time_logs and job_materials' }, { status: 403 });
  }

  // Additional data ownership validation for technicians
  if (profile.role === 'technician') {
    if (table === 'time_logs') {
      // Technicians can only create/update their own time logs
      if (operation !== 'DELETE' && payload.technician_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden: can only modify your own time logs' }, { status: 403 });
      }
      // For DELETE, verify the time log belongs to them
      if (operation === 'DELETE' && payload.id) {
        const { data: existing } = await supabase.from('time_logs').select('technician_id').eq('id', payload.id).single();
        if (!existing || existing.technician_id !== user.id) {
          return NextResponse.json({ error: 'Forbidden: can only delete your own time logs' }, { status: 403 });
        }
      }
    } else if (table === 'job_materials') {
      // Technicians can only modify job materials on jobs assigned to them
      const jobCardId = payload.job_card_id || (operation === 'UPDATE' ? payload.id : null);
      if (!jobCardId) {
        return NextResponse.json({ error: 'Missing job_card_id' }, { status: 400 });
      }
      const { data: job } = await supabase.from('job_cards').select('assigned_to').eq('id', jobCardId).single();
      if (!job || job.assigned_to !== user.id) {
        return NextResponse.json({ error: 'Forbidden: can only modify materials on jobs assigned to you' }, { status: 403 });
      }
    }
  }

  // Check for conflicts on UPDATE/DELETE
  if (operation === 'UPDATE' || operation === 'DELETE') {
    const clientUpdatedAt = payload.updated_at;
    if (clientUpdatedAt) {
      const { data: existing } = await supabase.from(table).select('updated_at').eq('id', payload.id).single();
      if (existing && existing.updated_at && existing.updated_at > clientUpdatedAt) {
        const { data: fullRecord } = await supabase.from(table).select('*').eq('id', payload.id).single();
        return NextResponse.json(
          { conflict: true, server_record: fullRecord, message: 'Record has been modified by another client' },
          { status: 409 }
        );
      }
    }
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

  // Log sync operation (using the user's IP from the request)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
  // Note: logAudit is called but we could also log sync operations specifically
  // For now, the sync operation success is enough

  return NextResponse.json({ success: true });
}