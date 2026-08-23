'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDemoLogin = () => {
    const fakeUser = {
      id: 'demo-admin-001',
      email: 'demo@plumbing.jms',
      user_metadata: { full_name: 'Demo Admin' },
    };
    localStorage.setItem('devAuth', JSON.stringify({ user: fakeUser, role: 'owner' }));
    document.cookie = 'dev_admin=1; path=/; max-age=86400';
    window.location.href = '/admin/overview';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        if (email === 'test@agentcy.co.za' && password === '123Admin') {
          const fakeUser = {
            id: 'dev-admin-001',
            email: 'test@agentcy.co.za',
            user_metadata: { full_name: 'Dev Admin' },
          };
          localStorage.setItem('devAuth', JSON.stringify({ user: fakeUser, role: 'owner' }));
          document.cookie = 'dev_admin=1; path=/; max-age=86400';
          window.location.href = '/admin/overview';
          return;
        }

        const { supabase } = await import('@/lib/supabase/client');
        if (!supabase) {
          setError('Supabase not configured');
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        const { supabase } = await import('@/lib/supabase/client');
        if (!supabase) {
          setError('Supabase not configured');
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        router.push('/login?message=Check your email to confirm your account');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase/client');
      if (!supabase) {
        setError('Supabase not configured');
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Google sign in');
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase/client');
      if (!supabase) {
        setError('Supabase not configured');
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      router.push('/magic-link?email=' + encodeURIComponent(email));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-strong w-full max-w-md rounded-3xl p-8 sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-[0_10px_30px_rgba(37,99,235,0.45)]">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z" />
            </svg>
          </span>
          <h1 className="brand-gradient text-3xl font-extrabold">Punctual Plumbers</h1>
          <p className="mt-2 text-sm text-white/80">
            {isLogin ? 'Sign in to your workspace' : 'Create your workspace'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
              autoComplete="email"
            />
          </div>

          {isLogin && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required={isLogin}
                autoComplete="current-password"
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/20" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/60">or</span>
          <div className="h-px flex-1 bg-white/20" />
        </div>

        <button
          type="button"
          onClick={handleMagicLink}
          className="btn w-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
          disabled={loading}
        >
          Send magic link instead
        </button>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="btn mt-3 w-full bg-white/90 text-secondary-700 hover:bg-white"
          disabled={loading}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
          </svg>
          Continue with Google
        </button>

        <div className="mt-6 border-t border-white/15 pt-6">
          <button
            onClick={handleDemoLogin}
            className="btn btn-accent w-full"
            disabled={loading}
          >
            Demo as Admin
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-white/80 hover:text-white"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
