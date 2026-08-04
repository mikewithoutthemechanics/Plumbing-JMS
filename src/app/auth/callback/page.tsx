'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    if (!supabase) {
      router.replace('/login');
      return;
    }

    // detectSessionInUrl (enabled on the client) exchanges the OAuth `?code=`
    // automatically. Wait for the resulting session, then route to the app.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace('/');
      }
    });

    const fallback = setTimeout(() => router.replace('/'), 5000);

    return () => {
      data.subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--plumber-primary)] mx-auto mb-4" />
        <p className="text-gray-600">Signing you in…</p>
      </div>
    </div>
  );
}
