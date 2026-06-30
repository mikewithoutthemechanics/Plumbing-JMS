import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getMockMaterials } from '@/lib/utils/dev-mock-data';
import MaterialsClient from './page.client';

export const dynamic = 'force-dynamic';

export default async function MaterialsPage() {
  const cookieStore = await cookies();
  const devMode = cookieStore.get('dev_admin')?.value === '1';

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
