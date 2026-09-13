import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getMockMaterials, isServerDevMode } from '@/lib/utils/dev-mock-data';
import MaterialsClient from './page.client';

export const fetchCache = 'force-no-store';

export default async function MaterialsPage() {
  const devMode = await isServerDevMode();

  if (devMode) {
    return <MaterialsClient initialMaterials={getMockMaterials()} />;
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return null;

  const { data: materials } = await supabase
    .from('materials')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  return <MaterialsClient initialMaterials={materials || []} />;
}
