import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import ProfileSetupClient from './page.client';

export const fetchCache = 'force-no-store';

export default async function ProfileSetupPage() {
  const cookieStore = await cookies();
  const devMode = cookieStore.get('dev_admin')?.value === '1';
  if (devMode) return <div className="card p-8 text-center text-gray-500">Profile setup unavailable in dev mode.</div>;

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role, full_name, email, phone').eq('id', user.id).single();

  if (profile?.role !== 'technician') {
    // Only technicians need wizard
    return null;
  }

  return <ProfileSetupClient userId={user.id} profile={profile} />;
}
