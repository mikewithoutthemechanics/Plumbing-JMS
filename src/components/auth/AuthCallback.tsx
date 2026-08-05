'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Completing sign in…');

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) {
        router.replace('/login');
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        router.replace('/');
        return;
      }

      if (!code) {
        setStatus('No authorization code found. Taking you to sign in…');
        setTimeout(() => router.replace('/login'), 1500);
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setStatus('Sign-in failed: ' + error.message);
        return;
      }
      if (active) router.replace('/');
    })();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--plumber-primary)] mx-auto mb-4" />
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}
