import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/utils/audit';

function invoiceNumber(): string {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${ym}-${rand}`;
}

// GET /api/invoices?customerId=...  -> list invoices (owner/accountant)
// POST /api/invoices -> generate invoice from a completed job
// PATCH /api/invoices -> record a payment against an invoice
export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner' && profile?.role !== 'accountant') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');

  let query = supabase
    .from('invoices')
    .select('*, payments(id, amount, method, created_at, note), customers(name, email, phone)')
    .order('issued_at', { ascending: false });
  if (customerId) query = query.eq('customer_id', customerId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoices: data });
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner' && profile?.role !== 'accountant') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { job_card_id } = body;
    if (!job_card_id) return NextResponse.json({ error: 'Missing job_card_id' }, { status: 400 });

    const { data: job } = await supabase.from('job_cards').select('*').eq('id', job_card_id).single();
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const { data: existing } = await supabase.from('invoices').select('id').eq('job_card_id', job_card_id).maybeSingle();
    if (existing) return NextResponse.json({ error: 'Invoice already exists for this job' }, { status: 400 });

    const amountDue = job.grand_total || (job.subtotal + job.vat_amount);
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        job_card_id,
        customer_id: job.customer_id,
        invoice_number: invoiceNumber(),
        amount_due: amountDue,
        vat_amount: job.vat_amount,
        amount_paid: 0,
        status: 'unpaid',
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit({ tableName: 'invoices', recordId: invoice.id, action: 'INSERT', newValues: invoice, changedBy: user.id });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner' && profile?.role !== 'accountant') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { invoice_id, amount, method, note } = body;
    if (!invoice_id || amount == null) {
      return NextResponse.json({ error: 'Missing invoice_id or amount' }, { status: 400 });
    }

    const { data: invoice } = await supabase.from('invoices').select('*').eq('id', invoice_id).single();
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const amountPaid = Number(invoice.amount_paid) + Number(amount);
    const newStatus = amountPaid >= invoice.amount_due ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid');

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        invoice_id,
        customer_id: invoice.customer_id,
        amount: Number(amount),
        method: method || 'cash',
        note: note || null,
        recorded_by: user.id,
      })
      .select()
      .single();
    if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });

    const { data: updated, error: updErr } = await supabase
      .from('invoices')
      .update({
        amount_paid: amountPaid,
        status: newStatus,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
      })
      .eq('id', invoice_id)
      .select()
      .single();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    await logAudit({ tableName: 'invoices', recordId: invoice_id, action: 'UPDATE', oldValues: invoice, newValues: updated, changedBy: user.id });
    return NextResponse.json({ invoice: updated, payment });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
