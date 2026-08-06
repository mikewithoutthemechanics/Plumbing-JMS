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
        if (!supabase) {
          if (active) setStatus('Supabase not configured');
          setError('Supabase client is not initialized');
          setTimeout(() => router.replace('/login'), 1500);
          return;
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        // Debug: Log what we received
        console.log('Callback received:', { code, state, url: url.toString() });

        if (!code) {
          if (active) setStatus('No authorization code found. Taking you to sign in…');
          setError('No authorization code in callback URL');
          setTimeout(() => router.replace('/login'), 1500);
          return;
        }

        // Check if we already have a session
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          console.log('Already have session, redirecting to dashboard');
          if (active) router.replace('/dashboard');
          return;
        }

        // Exchange the code for a session
        console.log('Exchanging code for session...');
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('Exchange code error:', exchangeError);
          if (active) setStatus('Sign-in failed: ' + exchangeError.message);
          setError('Failed to exchange code for session: ' + exchangeError.message);
          return;
        }

        console.log('Exchange successful, session data:', {
          session: data.session ? 'present' : 'none',
          user: data.user ? data.user.email : 'none'
        });

        if (active) {
          // Redirect to dashboard after successful sign-in
          router.replace('/dashboard');
        }
      } catch (err) {
        console.error('Unexpected error in callback:', err);
        if (active) setStatus('An unexpected error occurred');
        setError('Unexpected error: ' + (err instanceof Error ? err.message : String(err)));
        // Still try to redirect to login to break potential loop
        setTimeout(() => router.replace('/login'), 1500);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  // Show error details in dev mode for debugging
  if (process.env.NODE_ENV !== 'production' && error) {
    // In development, we could show the error, but for now just log it
    console.log('Callback error (dev):', error);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--plumber-primary)] mx-auto mb-4" />
        <p className="text-gray-600">{status}</p>
        {/* In development, show error details */}
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
