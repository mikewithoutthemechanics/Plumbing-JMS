'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Completing sign in…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        console.log('Callback page executing...');

        // Check if Supabase is available
        if (!supabase) {
          console.error('Supabase client is null');
          if (active) setStatus('Supabase not configured - checking env...');
          setError('Supabase client is not initialized');

          // Debug environment variables
          console.log('Env check:', {
            hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
            keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
          });

          setTimeout(() => router.replace('/login'), 2000);
          return;
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        console.log('Callback received:', {
          code: code ? `${code.substring(0, 8)}...` : 'NULL',
          state,
          href: url.href,
          pathname: url.pathname
        });

        if (!code) {
          if (active) setStatus('No authorization code found. Taking you to sign in…');
          setError('No authorization code in callback URL');
          console.error('No code in URL:', url.href);
          setTimeout(() => router.replace('/login'), 1500);
          return;
        }

        // First, try to exchange the code for a session
        console.log('Exchanging code for session...');
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('Exchange code error:', exchangeError);
          if (active) setStatus('Sign-in failed: ' + exchangeError.message);
          setError('Failed to exchange code for session: ' + exchangeError.message);

          // Also try to get session to see if we somehow already have one
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            console.log('Found existing session despite exchange error, going to dashboard');
            if (active) router.replace('/dashboard');
            return;
          }

          setTimeout(() => router.replace('/login'), 2000);
          return;
        }

        console.log('Exchange successful! Session data received:', {
          hasSession: !!data.session,
          userEmail: data.user?.email || 'no user',
          expiresAt: data.session?.expires_at
        });

        // Verify we actually have a valid session after exchange
        const { data: { session: verifiedSession } } = await supabase.auth.getSession();
        if (verifiedSession) {
          console.log('Verified session exists, redirecting to dashboard');
          if (active) router.replace('/dashboard');
        } else {
          console.error('Exchange succeeded but no session found afterwards');
          if (active) setStatus('Sign-in completed but session not found');
          setError('Session not found after successful code exchange');
          setTimeout(() => router.replace('/login'), 2000);
        }
      } catch (err) {
        console.error('Unexpected error in callback:', err);
        if (active) setStatus('An unexpected error occurred');
        setError('Unexpected error: ' + (err instanceof Error ? err.message : String(err)));
        // Still try to redirect to login to break potential loop
        setTimeout(() => router.replace('/login'), 2000);
      }
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
        {/* Show error details in development */}
        {process.env.NODE_ENV !== 'production' && error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            <div className="font-semibold">Debug Info:</div>
            <div className="mt-1">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}
