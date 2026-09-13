import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isServerDevMode } from '@/lib/utils/dev-mock-data';
import AdminJobDetailClient from './page.client';

export const fetchCache = 'force-no-store';

export default async function AdminJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const devMode = await isServerDevMode();

  if (devMode) {
    return <div className="card p-8 text-center text-gray-500">Job detail preview unavailable in dev mode.</div>;
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return null;

  return <AdminJobDetailClient jobId={id} />;
}
