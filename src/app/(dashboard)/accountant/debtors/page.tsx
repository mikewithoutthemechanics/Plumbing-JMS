import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isServerDevMode } from '@/lib/utils/dev-mock-data';
import DebtorsClient from './page.client';

export const fetchCache = 'force-no-store';

export default async function AccountantDebtorsPage() {
  const devMode = await isServerDevMode();
  if (devMode) {
    return <DebtorsClient initialDebtors={[]} totalOutstanding={0} />;
  }
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner' && profile?.role !== 'accountant') return null;

  const { data } = await supabase
    .from('debtors_view')
    .select('*')
    .gt('outstanding', 0)
    .order('outstanding', { ascending: false });
  const total = (data || []).reduce((sum, d) => sum + Number(d.outstanding), 0);

  return <DebtorsClient initialDebtors={data || []} totalOutstanding={total} />;
}
