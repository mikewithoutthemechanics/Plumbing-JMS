import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isServerDevMode } from '@/lib/utils/dev-mock-data';
import AdminQuotesClient from './page.client';

export const fetchCache = 'force-no-store';

export default async function AdminQuotesPage({ searchParams }: { searchParams: Promise<{ quote?: string }> }) {
  const { quote: selectedQuoteId } = await searchParams;
  const devMode = await isServerDevMode();

  if (devMode) {
    const MOCK_QUOTES = [
      { id: '1', customer_name: 'John Smith', customer_phone: '082 123 4567', description: 'Leaking tap repair', status: 'pending' as const, created_at: new Date().toISOString() },
      { id: '2', customer_name: 'Jane Doe', customer_email: 'jane@example.com', customer_phone: '', description: 'Geyser installation', status: 'quoted' as const, estimated_price: 2500, created_at: new Date().toISOString() },
    ];
    return <AdminQuotesClient initialQuotes={MOCK_QUOTES} initialSelectedQuoteId={selectedQuoteId} />;
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return null;

  const { data: quotes } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false });

  return <AdminQuotesClient initialQuotes={quotes || []} initialSelectedQuoteId={selectedQuoteId} />;
}
