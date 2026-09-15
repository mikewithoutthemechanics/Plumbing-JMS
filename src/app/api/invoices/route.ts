import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, getSupabaseServerClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/utils/audit';
import { validateInvoiceInput, validatePaymentInput } from '@/lib/validation';
import { calculateJobTotals } from '@/lib/utils/calculations';

function invoiceNumber(): string {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const unique = Math.random().toString(36).slice(2, 8);
  return `INV-${ym}-${unique}`;
}

// GET /api/invoices?customerId=...  -> list invoices (owner/accountant)
// POST /api/invoices -> generate invoice from a completed job
// PATCH /api/invoices -> record a payment against an invoice
export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
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
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner' && profile?.role !== 'accountant') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Validate input
    const validationErrors = validateInvoiceInput(body);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join(', ') }, { status: 400 });
    }

    const { job_card_id } = body;

    const { data: job } = await supabase.from('job_cards').select('*').eq('id', job_card_id).single();
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const { data: existing } = await supabase.from('invoices').select('id').eq('job_card_id', job_card_id).maybeSingle();
    if (existing) return NextResponse.json({ error: 'Invoice already exists for this job' }, { status: 400 });

    // Recalculate totals from job materials + time logs (don't rely on stale grand_total)
    const { data: jobMaterials } = await supabase
      .from('job_materials')
      .select('admin_unit_price, quantity')
      .eq('job_card_id', job_card_id);
    const { data: timeLogs } = await supabase
      .from('time_logs')
      .select('hours')
      .eq('job_card_id', job_card_id);

    const materials = (jobMaterials || []).map(m => ({
      unitPrice: m.admin_unit_price || 0,
      quantity: m.quantity || 0,
    }));
    const totalHours = (timeLogs || []).reduce((sum, t) => sum + (t.hours || 0), 0);
    const hourlyRate = job.admin_hourly_rate || 0;
    const totals = calculateJobTotals(hourlyRate, totalHours, materials);

    const amountDue = totals.grandTotal;
    // Sync job_cards so the card display matches the invoice (fixes stale grand_total after material adds)
    await supabase.from('job_cards').update({
      labour_cost: totals.labour,
      materials_cost: totals.materialsCost,
      subtotal: totals.subtotal,
      vat_amount: totals.vat,
      grand_total: totals.grandTotal,
    } as never).eq('id', job_card_id);
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        job_card_id,
        customer_id: job.customer_id,
        invoice_number: invoiceNumber(),
        amount_due: amountDue,
        vat_amount: totals.vat,
        amount_paid: 0,
        status: 'unpaid',
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit({ tableName: 'invoices', recordId: invoice.id, action: 'INSERT', newValues: invoice, changedBy: user.id });

    // Send to accountant(s) on file — in-app notification + email (fixes "invoice needs to be sent to accountant")
    try {
      const { data: accountants, error: accErr } = await supabase.from('profiles').select('id, email, full_name').eq('role', 'accountant');
      console.log('[Invoices] accountants query', { count: accountants?.length, accErr: accErr?.message });
      if (accErr) console.error('[Invoices] accountant fetch failed', accErr);
      if (accountants?.length) {
        const admin = getSupabaseAdminClient();
        for (const acc of accountants) {
          try {
            const { error: notifErr } = await admin.from('user_notifications').insert({
              user_id: acc.id,
              profile_id: acc.id,
              type: 'invoice',
              title: `New invoice ${invoice.invoice_number}`,
              message: `Invoice ${invoice.invoice_number} for job ${job.job_number || job_card_id} — R${amountDue.toFixed(2)} (VAT R${totals.vat.toFixed(2)}) — Accountant → Invoices`,
              data: { invoice_id: invoice.id, job_card_id, amount_due: amountDue, job_number: job.job_number },
            } as never);
            if (notifErr) console.error('[Invoices] notification insert failed', notifErr);
            else console.log('[Invoices] notification inserted for', acc.email);
          } catch (e) { console.error('[Invoices] notification exception', e); }
          if (acc.email) {
            try {
              const { sendViaAgentMail } = await import('@/lib/notifications/agentmail');
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://plumbing-jms.vercel.app';
              console.log('[Invoices] sending AgentMail to', acc.email, 'invoice', invoice.invoice_number);
              const res = await sendViaAgentMail({
                to: acc.email,
                subject: `New invoice ${invoice.invoice_number} — R${amountDue.toFixed(2)}`,
                html: `<p>Hi ${acc.full_name || 'Accountant'},</p><p>New invoice <strong>${invoice.invoice_number}</strong> created for job ${job.job_number || job_card_id} — amount due <strong>R${amountDue.toFixed(2)}</strong> (VAT R${totals.vat.toFixed(2)}).</p><p><a href="${appUrl}/accountant/jobs">View in Accountant → Invoices</a></p>`,
              });
              console.log('[Invoices] AgentMail sent', res);
            } catch (e) { console.error('[Invoices] AgentMail failed for', acc.email, e); }
          }
        }
      } else {
        console.log('[Invoices] no accountants found — email not sent');
      }
    } catch (e) { console.error('[Invoices] accountant notify outer failed', e); }
    return NextResponse.json({ invoice }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner' && profile?.role !== 'accountant') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Validate input
    const validationErrors = validatePaymentInput(body);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join(', ') }, { status: 400 });
    }

    const { invoice_id, amount, method, note } = body;

    const { data: invoice } = await supabase.from('invoices').select('*').eq('id', invoice_id).single();
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    // H2 guard: reject overpayments instead of silently recording them.
    const outstanding = Number(invoice.amount_due) - Number(invoice.amount_paid);
    if (Number(amount) > outstanding) {
      return NextResponse.json(
        {
          error: `Payment exceeds outstanding balance. Outstanding: R${outstanding.toFixed(2)}.`,
          outstanding,
        },
        { status: 400 }
      );
    }

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

export async function DELETE(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get('id');
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
  const { data: existing } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
  if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  // Delete payments first (FK), then invoice
  await supabase.from('payments').delete().eq('invoice_id', invoiceId);
  const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({ tableName: 'invoices', recordId: invoiceId, action: 'DELETE', oldValues: existing, changedBy: user.id });
  return NextResponse.json({ success: true });
}