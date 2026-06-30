import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getMockJobs } from '@/lib/utils/dev-mock-data';
import type { JobCard } from '@/types';
import AdminJobsClient from './page.client';

export const dynamic = 'force-dynamic';

export default async function AdminJobsPage() {
  const cookieStore = await cookies();
  const devMode = cookieStore.get('dev_admin')?.value === '1';

  if (devMode) {
    return <AdminJobsClient initialJobs={getMockJobs()} />;
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return null;

  const { data: jobs } = await supabase
    .from('job_cards')
    .select(`
      *,
      customer:customers(*),
      assigned_to_profile:profiles!job_cards_assigned_to_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false });

  return (
    <AdminJobsClient
      initialJobs={(jobs || []) as unknown as JobCard[]}
    />
  );
}
