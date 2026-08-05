import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lazy initialization to avoid prerender errors.
// Uses the SSR browser client so the session is stored in cookies and can be
// read by the middleware (which protects routes server-side).
let _supabase: ReturnType<typeof createBrowserClient> | null = null;

function getSupabase() {
  // createBrowserClient touches document.cookie; only instantiate in the browser.
  // Components already guard against a null client during SSR.
  if (typeof window === 'undefined') return null;
  if (!_supabase && supabaseUrl && supabaseAnonKey) {
    _supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _supabase;
}

// Export for use - will be null during prerender or if env vars missing
export const supabase = getSupabase();
