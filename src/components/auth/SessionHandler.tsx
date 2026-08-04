'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

/**
 * Initializes the Supabase client (which auto-reads the OAuth token from the
 * URL via `detectSessionInUrl`, for both `?code=` PKCE and `#access_token=`
 * implicit flows) and redirects into the app once a session exists.
 * Renders nothing — safe to drop into any page.
 */
export default function SessionHandler() {
  const router = useRouter();

  useEffect(() => {
    const client = supabase;
    if (!client) {
      router.replace('/login');
      return;
    }

    const { data } = client.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (session) {
        router.replace('/');
      }
    });

    // Fallback in case the SIGNED_IN event was missed.
    const t = setTimeout(async () => {
      const { data: s } = await client.auth.getSession();
      if (s.session) router.replace('/');
    }, 1500);

    return () => {
      data.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, [router]);

  return null;
}
