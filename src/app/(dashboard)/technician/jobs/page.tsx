import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getMockJobs, isServerDevMode } from '@/lib/utils/dev-mock-data';
import TechnicianJobsClient from './page.client';

export const fetchCache = 'force-no-store';

export default async function TechnicianJobsPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job: selectedJobId } = await searchParams;
  const devMode = await isServerDevMode();

  if (devMode) {
    return <TechnicianJobsClient initialJobs={getMockJobs()} userId="dev-admin-001" initialSelectedJobId={selectedJobId} />;
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
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
    .order('created_at', { ascending: false });

  return <TechnicianJobsClient initialJobs={jobs || []} userId={user.id} initialSelectedJobId={selectedJobId} />;
}
