import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// GET /api/debtors -> customers with outstanding amounts (owner/accountant)
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner' && profile?.role !== 'accountant') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('debtors_view')
    .select('*')
    .gt('outstanding', 0)
    .order('outstanding', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = (data || []).reduce((sum, d) => sum + Number(d.outstanding), 0);
  return NextResponse.json({ debtors: data, totalOutstanding: total });
}
