import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'technician';

  switch (role) {
    case 'owner':
      redirect('/admin/overview');
    case 'technician':
      redirect('/technician/jobs');
    case 'accountant':
      redirect('/accountant/jobs');
    default:
      redirect('/login');
  }
}
