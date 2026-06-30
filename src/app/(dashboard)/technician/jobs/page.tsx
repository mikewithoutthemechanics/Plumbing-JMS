import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getMockJobs } from '@/lib/utils/dev-mock-data';
import TechnicianJobsClient from './page.client';

export const dynamic = 'force-dynamic';

export default async function TechnicianJobsPage() {
  const cookieStore = await cookies();
  const devMode = cookieStore.get('dev_admin')?.value === '1';

  if (devMode) {
    return <TechnicianJobsClient initialJobs={getMockJobs()} userId="dev-admin-001" />;
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'technician') return null;

  const { data: jobs } = await supabase
    .from('job_cards')
    .select(`
      *,
      customer:customers(name),
      job_materials(*)
    `)
    .eq('assigned_to', user.id)
    .order('created_at', { ascending: false });

  return <TechnicianJobsClient initialJobs={jobs || []} userId={user.id} />;
}
