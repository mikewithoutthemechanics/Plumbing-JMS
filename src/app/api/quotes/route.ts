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
    .select('*, customers(name)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ quotes: quotes || [] });
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