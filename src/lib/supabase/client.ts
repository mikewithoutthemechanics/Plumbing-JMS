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

// Export a function so it initializes on client-side (not at module load during SSR)
export const createSupabaseClient = () => getSupabase();
export const getSupabaseClient = () => getSupabase();
export function getClient() {
  return getSupabase();
}

// For backward compatibility - use a Proxy that lazily initializes on first property access
// This works because during SSR the Proxy returns null for all properties, but on client
// the first access (e.g., supabase.auth) will call getSupabase() and return the real client
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_target, prop) {
    const client = getSupabase();
    if (!client) return undefined;
    return (client as Record<string, unknown>)[prop as string];
  },
});
