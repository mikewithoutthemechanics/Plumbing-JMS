import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getMockJobs, getMockMaterials } from '@/lib/utils/dev-mock-data';
import TechnicianMaterialsClient from './page.client';

export const dynamic = 'force-dynamic';

interface MaterialSummary {
  id: string;
  name: string;
  unit: string;
}

export default async function TechnicianMaterialsPage() {
  const cookieStore = await cookies();
  const devMode = cookieStore.get('dev_admin')?.value === '1';

  if (devMode) {
    return (
      <TechnicianMaterialsClient activeJobs={getMockJobs()} materials={getMockMaterials().map(m => ({ id: m.id, name: m.name, unit: m.unit }))} />
    );
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'technician') return null;

  const { data: activeJobs } = await supabase
    .from('job_cards')
    .select('id, job_number, description, status')
    .eq('assigned_to', user.id)
    .in('status', ['assigned', 'in_progress']);

  const { data: materials } = await supabase
    .from('materials')
    .select('id, name, unit')
    .eq('is_active', true)
    .order('name', { ascending: true });

  return (
    <TechnicianMaterialsClient activeJobs={activeJobs || []} materials={(materials || []) as MaterialSummary[]} />
  );
}
