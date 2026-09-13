import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isServerDevMode } from '@/lib/utils/dev-mock-data';
import StaffClient from './page.client';

export const fetchCache = 'force-no-store';

export default async function StaffPage() {
  const devMode = await isServerDevMode();

  if (devMode) {
    return <StaffClient initialStaff={[]} />;
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return null;

  const { data: staff } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, phone, created_at, updated_at')
    .order('created_at', { ascending: false });

  return <StaffClient initialStaff={staff || []} />;
}
