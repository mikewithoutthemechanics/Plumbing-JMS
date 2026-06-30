import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import TechnicianScheduleClient from './page.client';

export const dynamic = 'force-dynamic';

export default async function TechnicianSchedulePage() {
  const cookieStore = await cookies();
  const devMode = cookieStore.get('dev_admin')?.value === '1';

  if (devMode) {
    const MOCK_SCHEDULE = [
      { id: '1', profile_id: 'dev-admin-001', date: '2026-07-01', status: 'available' as const, created_at: new Date().toISOString() },
      { id: '2', profile_id: 'dev-admin-001', date: '2026-07-02', status: 'available' as const, created_at: new Date().toISOString() },
    ];
    return <TechnicianScheduleClient initialSchedule={MOCK_SCHEDULE} isOwner={true} />;
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile) return null;

  const { data: schedule } = await supabase
    .from('staff_schedule')
    .select('*, profiles(full_name)')
    .gte('date', new Date().toISOString().split('T')[0])
    .lte('date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('date', { ascending: true });

  return <TechnicianScheduleClient initialSchedule={schedule || []} isOwner={profile.role === 'owner'} />;
}