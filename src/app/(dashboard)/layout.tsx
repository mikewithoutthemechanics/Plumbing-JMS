'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants/storage';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';

interface DevAuth {
  user: { id: string; email: string; user_metadata: { full_name: string } };
  role: string;
}

function isDevMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(LOCAL_STORAGE_KEYS.DEV_AUTH) !== null;
}

function getDevAuth(): DevAuth | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.DEV_AUTH);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as DevAuth;
  } catch {
    return null;
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<{ email: string; role?: string; name?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { supported, permission, subscribed, subscribe } = usePushNotifications();

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  useEffect(() => {
    // Auto-subscribe technicians to push notifications
    if (supported && permission === 'granted' && !subscribed && user?.role === 'technician') {
      subscribe().catch(console.error);
    }
  }, [supported, permission, subscribed, subscribe, user?.role]);

  useEffect(() => {
    const initAuth = async () => {
      const devAuth = getDevAuth();
      if (devAuth) {
        setUser({
          email: devAuth.user.email,
          role: devAuth.role,
          name: devAuth.user.user_metadata.full_name,
        });
        setLoading(false);
        return;
      }

      const { supabase } = await import('@/lib/supabase/client');
      if (!supabase) {
        router.push('/login');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, email, phone')
        .eq('id', user.id)
        .single();

      const profileData = profile as unknown as { role?: string; full_name?: string; email?: string; phone?: string } | null;
      const userObj = { email: user.email!, role: profileData?.role, name: profileData?.full_name, profile: profileData };
      setUser({ email: user.email!, role: profileData?.role, name: profileData?.full_name });
      // Profile setup redirect for technicians
      if (profileData?.role === 'technician' && (!profileData?.full_name || !profileData?.email || !profileData?.phone)) {
        router.push('/profile-setup');
        setLoading(false);
        return;
      }
      setLoading(false);
    };

    initAuth();
  }, [router]);

  const handleLogout = async () => {
    if (isDevMode()) {
      localStorage.removeItem('devAuth');
      document.cookie = 'dev_admin=; path=/; max-age=0';
      router.push('/login');
      return;
    }
    const { supabase } = await import('@/lib/supabase/client');
    if (supabase) await supabase.auth.signOut();
    router.push('/login');
  };

  const role = user?.role || 'technician';
  const displayName = user?.name || user?.email || '';
  const initials = (displayName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()) || 'PP';

  const getNavItems = () => {
    switch (role) {
      case 'owner':
        return [
          { href: '/admin/overview', label: 'Overview', icon: '📊' },
          { href: '/admin/jobs', label: 'Jobs', icon: '🔧' },
          { href: '/admin/staff', label: 'Staff', icon: '👷' },
          { href: '/admin/customers', label: 'Customers', icon: '👥' },
          { href: '/admin/materials', label: 'Materials', icon: '📦' },
        ];
      case 'technician':
        return [
          { href: '/technician/jobs', label: 'My Jobs', icon: '📋' },
          { href: '/technician/time', label: 'Time Log', icon: '⏱️' },
          { href: '/technician/materials', label: 'Materials', icon: '📦' },
        ];
      case 'accountant':
        return [
          { href: '/accountant/jobs', label: 'Job Cards', icon: '📄' },
          { href: '/accountant/debtors', label: 'Debtors', icon: '💰' },
          { href: '/accountant/exports', label: 'Exports', icon: '📥' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user && !isDevMode()) return null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40">
        <nav className="glass border-b border-white/60">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z" />
                  </svg>
                </span>
                <h1 className="brand-gradient text-xl font-extrabold">Punctual Plumbers</h1>
              </Link>
              <div className="hidden items-center gap-1 md:flex">
                {navItems.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)]'
                          : 'text-secondary-600 hover:bg-white/70 hover:text-primary-700'
                      }`}
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2.5 sm:flex">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary-600 to-accent-500 text-sm font-semibold text-white shadow-soft">
                  {initials}
                </span>
                <span className="text-sm font-medium text-secondary-700">
                  {isDevMode() ? '🔧 ' : ''}
                  {displayName}
                </span>
              </div>
              <button onClick={handleLogout} className="btn btn-ghost text-sm">
                Logout
              </button>
            </div>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
