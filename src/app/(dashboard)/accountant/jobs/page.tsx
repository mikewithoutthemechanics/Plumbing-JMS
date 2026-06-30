import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getMockJobs } from '@/lib/utils/dev-mock-data';

export const dynamic = 'force-dynamic';

import AccountantJobsClient from './page.client';

export default async function AccountantJobsPage() {
  const cookieStore = await cookies();
  const devMode = cookieStore.get('dev_admin')?.value === '1';

  if (devMode) {
    return <AccountantJobsClient initialJobs={getMockJobs()} />;
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'accountant') return null;

  const { data: jobs } = await supabase
    .from('job_cards')
    .select(`
      *,
      customer:customers(name),
      assigned_to_profile:profiles!job_cards_assigned_to_fkey(full_name)
    `)
    .in('status', ['completed', 'invoiced'])
    .order('invoiced_at', { ascending: false });

  return <AccountantJobsClient initialJobs={jobs || []} />;
}
