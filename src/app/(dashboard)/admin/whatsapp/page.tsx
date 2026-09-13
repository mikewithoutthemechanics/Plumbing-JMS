import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isServerDevMode } from '@/lib/utils/dev-mock-data';
import WhatsappClient from './page.client';

export const fetchCache = 'force-no-store';

export default async function AdminWhatsappPage() {
  const devMode = await isServerDevMode();
  if (devMode) {
    return <WhatsappClient initialConfig={null} />;
  }
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return null;

  const { data } = await supabase.from('whatsapp_config').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return <WhatsappClient initialConfig={data ?? null} />;
}
