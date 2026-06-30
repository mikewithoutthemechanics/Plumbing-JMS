import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import AdminQuotesClient from './page.client';

export const dynamic = 'force-dynamic';

export default async function AdminQuotesPage() {
  const cookieStore = await cookies();
  const devMode = cookieStore.get('dev_admin')?.value === '1';

  if (devMode) {
    const MOCK_QUOTES = [
      { id: '1', customer_name: 'John Smith', customer_phone: '082 123 4567', description: 'Leaking tap repair', status: 'pending' as const, created_at: new Date().toISOString() },
      { id: '2', customer_name: 'Jane Doe', customer_email: 'jane@example.com', customer_phone: '', description: 'Geyser installation', status: 'quoted' as const, estimated_price: 2500, created_at: new Date().toISOString() },
    ];
    return <AdminQuotesClient initialQuotes={MOCK_QUOTES} />;
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return null;

  const { data: quotes } = await supabase
    .from('quotes')
    .select('*, customers(name)')
    .order('created_at', { ascending: false });

  return <AdminQuotesClient initialQuotes={quotes || []} />;
}