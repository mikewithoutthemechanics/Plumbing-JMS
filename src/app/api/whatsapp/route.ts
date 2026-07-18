import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sendWhatsappMessage, renderTemplate, type OpenWaConfig } from '@/lib/utils/whatsapp';

// GET /api/whatsapp -> current OpenWA config (owner only)
// PUT /api/whatsapp -> update OpenWA config (owner only)
// POST /api/whatsapp -> send a reminder for an invoice (owner/accountant)
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data } = await supabase.from('whatsapp_config').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ config: data });
}

export async function PUT(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { base_url, session_name, enabled, reminder_template } = body;
    const { data: existing } = await supabase.from('whatsapp_config').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .update({ base_url, session_name: session_name || 'main', enabled: !!enabled, reminder_template })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ config: data });
    }
    const { data, error } = await supabase
      .from('whatsapp_config')
      .insert({ base_url, session_name: session_name || 'main', enabled: !!enabled, reminder_template })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ config: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
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
    const { invoice_id } = body;
    if (!invoice_id) return NextResponse.json({ error: 'Missing invoice_id' }, { status: 400 });

    const { data: invoice } = await supabase.from('invoices').select('*, customers(name, phone)').eq('id', invoice_id).single();
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const { data: config } = await supabase.from('whatsapp_config').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!config) return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 });

    const phone = (invoice.customers as { phone?: string } | null)?.phone;
    if (!phone) return NextResponse.json({ error: 'Customer has no phone number' }, { status: 400 });

    const message = renderTemplate(config.reminder_template, {
      customer_name: (invoice.customers as { name?: string } | null)?.name || 'Customer',
      invoice_number: invoice.invoice_number,
      amount_due: (invoice.amount_due - invoice.amount_paid).toFixed(2),
    });

    const result = await sendWhatsappMessage(config as OpenWaConfig, phone, message);

    await supabase.from('whatsapp_messages').insert({
      invoice_id,
      customer_id: invoice.customer_id,
      to_number: phone,
      message,
      status: result.success ? 'sent' : 'failed',
      error: result.error,
    });

    if (!result.success) return NextResponse.json({ error: result.error }, { status: 502 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
