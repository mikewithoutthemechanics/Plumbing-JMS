import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/utils/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ quotes: quotes || [] });
}

export async function PUT(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { quote_id, id, status } = body;
    const quoteId = quote_id || id;
    if (!quoteId || !status) {
      return NextResponse.json({ error: 'Missing quote_id or status' }, { status: 400 });
    }

    const validStatuses = ['pending', 'reviewed', 'quoted', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { data: quote } = await supabase.from('quotes').select('*').eq('id', quoteId).single();
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

    const updateData: Record<string, unknown> = { status };

    // When accepting a quote, create a job card
    if (status === 'accepted' && quote.status !== 'accepted') {
      let customerId = quote.customer_id;

      // Find or create customer from quote data
      if (!customerId && quote.customer_email) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', quote.customer_email)
          .single();
        if (existingCustomer) customerId = existingCustomer.id;
      }

      if (!customerId) {
        const customerName = quote.customer_name || 'Unknown Customer';
        const { data: newCustomer, error: custErr } = await supabase
          .from('customers')
          .insert({
            name: customerName,
            email: quote.customer_email || null,
            phone: quote.customer_phone || null,
            address: '',
          })
          .select('id')
          .single();
        if (custErr) {
          console.error('[Quotes API] Failed to create customer:', custErr);
          return NextResponse.json({ error: 'Failed to create customer from quote' }, { status: 500 });
        }
        customerId = newCustomer.id;
        updateData.customer_id = customerId;
      }

      const jobNumber = `JOB-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Auto-assign to least-busy technician
      let assignedTo: string | null = null;
      const { data: technicians } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'technician');
      if (technicians && technicians.length > 0) {
        const { data: activeJobs } = await supabase
          .from('job_cards')
          .select('assigned_to')
          .in('status', ['assigned', 'in_progress']);
        const counts: Record<string, number> = {};
        (activeJobs || []).forEach(j => { if (j.assigned_to) counts[j.assigned_to] = (counts[j.assigned_to] || 0) + 1; });
        const sorted = [...technicians].sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0));
        assignedTo = sorted[0].id;
      }

      const { error: jobErr } = await supabase
        .from('job_cards')
        .insert({
          job_number: jobNumber,
          customer_id: customerId,
          description: quote.description || 'Job from accepted quote',
          admin_hourly_rate: 0,
          assigned_to: assignedTo,
          status: assignedTo ? 'assigned' : 'pending',
          created_by: user.id,
          labour_cost: 0,
          materials_cost: 0,
          subtotal: 0,
          vat_amount: 0,
          grand_total: 0,
        });
      if (jobErr) {
        console.error('[Quotes API] Failed to create job:', jobErr);
        return NextResponse.json({ error: 'Failed to create job from quote' }, { status: 500 });
      }
    }

    const { data: updated, error: updErr } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', quoteId)
      .select()
      .single();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    await logAudit({
      tableName: 'quotes',
      recordId: quoteId,
      action: 'UPDATE',
      oldValues: { status: quote.status },
      newValues: updateData,
      changedBy: user.id,
    });

    return NextResponse.json({ quote: updated });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // H1 guard: unauthenticated submissions come from the public quote form
  // (allowed by design). Any authenticated user must be owner/accountant —
  // technicians may not create quotes.
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['owner', 'accountant'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // M1 guard: basic anti-spam validation for public (and authenticated) posts.
  const body = await request.json();
  const { customer_name, customer_email, customer_phone, description } = body;

  if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length < 2 || customer_name.length > 120) {
    return NextResponse.json({ error: 'Valid customer name is required' }, { status: 400 });
  }
  if (customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
    return NextResponse.json({ error: 'Invalid customer email' }, { status: 400 });
  }

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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (user) {
    await logAudit({
      tableName: 'quotes',
      recordId: quote.id,
      action: 'INSERT',
      newValues: { customer_name, description },
      changedBy: user.id,
    });
  }

  return NextResponse.json({ quote }, { status: 201 });
}
