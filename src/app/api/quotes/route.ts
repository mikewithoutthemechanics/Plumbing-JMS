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

  const body = await request.json();
  const { customer_name, customer_email, customer_phone, description } = body;

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