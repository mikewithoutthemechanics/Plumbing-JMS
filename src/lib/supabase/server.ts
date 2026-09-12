import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export { createServerClient };

/** Fail fast when required Supabase env vars are missing (admin/service-role). */
function requireSupabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missing: string[] = [];
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!key) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length > 0) {
    throw new Error(
      `Missing required Supabase environment variables: ${missing.join(', ')}. ` +
        'Set them in .env.local (dev) or your hosting provider settings (prod).'
    );
  }
  return { url: url as string, key: key as string };
}

/** Fail fast when required Supabase env vars are missing (user-scoped anon client). */
function requireSupabaseAnonEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const missing: string[] = [];
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!key) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (missing.length > 0) {
    throw new Error(
      `Missing required Supabase environment variables: ${missing.join(', ')}. ` +
        'Set them in .env.local (dev) or your hosting provider settings (prod).'
    );
  }
  return { url: url as string, key: key as string };
}

/**
 * User-scoped server client (anon key + request cookies).
 *
 * Contract: every query through this client is subject to RLS as the
 * logged-in user. Service-level work that must bypass RLS (audit writes,
 * notification fan-out) belongs on {@link getSupabaseAdminClient}.
 * Changing this key changes the security posture of ALL API routes.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url: supabaseUrl, key: anonKey } = requireSupabaseAnonEnv();

  return createServerClient(
    supabaseUrl,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}

export function getSupabaseAdminClient() {
  const { url: supabaseUrl, key: serviceKey } = requireSupabaseEnv();
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
