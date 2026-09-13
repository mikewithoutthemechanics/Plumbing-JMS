import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getMockCustomers, isServerDevMode } from '@/lib/utils/dev-mock-data';
import CustomersClient from './page.client';

export const fetchCache = 'force-no-store';

export default async function CustomersPage() {
  const devMode = await isServerDevMode();

  if (devMode) {
    return <CustomersClient initialCustomers={getMockCustomers()} />;
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return null;

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true });

  return <CustomersClient initialCustomers={customers || []} />;
}
