import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import WhatsappClient from './page.client';

export const dynamic = 'force-dynamic';

export default async function AdminWhatsappPage() {
  const cookieStore = await cookies();
  const devMode = cookieStore.get('dev_admin')?.value === '1';
  if (devMode) {
    return <WhatsappClient initialConfig={null} />;
  }
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return null;

  const { data } = await supabase.from('whatsapp_config').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return <WhatsappClient initialConfig={data as never} />;
}
