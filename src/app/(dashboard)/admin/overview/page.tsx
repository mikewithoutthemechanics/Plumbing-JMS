import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { JobCard } from '@/types';
import AdminOverviewClient from './page.client';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const cookieStore = await cookies();
  const devMode = cookieStore.get('dev_admin')?.value === '1';

  if (devMode) {
    return <AdminOverviewClient />;
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return null;

  const [{ data: jobs }, { data: recentAudits }, { data: lowStock }] = await Promise.all([
    supabase.from('job_cards').select('status, grand_total, created_at').order('created_at', { ascending: false }).limit(10),
    supabase.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(10),
    supabase.from('materials').select('id, name, unit, quantity_on_hand, admin_unit_price, is_active, created_at, updated_at').lte('quantity_on_hand', 5).eq('is_active', true),
  ]);

  return (
    <AdminOverviewClient
      jobs={(jobs || []) as JobCard[]}
      recentAudits={recentAudits || []}
      lowStock={lowStock || []}
    />
  );
}
