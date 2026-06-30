'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DevAuth {
  user: { id: string; email: string; user_metadata: { full_name: string } };
  role: string;
}

function isDevMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('devAuth') !== null;
}

function getDevAuth(): DevAuth | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('devAuth');
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

      setUser({ email: user.email!, role: profile?.role, name: profile?.full_name });
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
    await supabase.auth.signOut();
    router.push('/login');
  };

  const role = user?.role || 'technician';
  const displayName = user?.name || user?.email || '';

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Plumbing JMS</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
{navItems.map((item) => (
                   <Link
                     key={item.href}
                     href={item.href}
                     aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                     className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                       pathname.startsWith(item.href)
                         ? 'border-blue-500 text-gray-900'
                         : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                     }`}
                   >
                     <span className="mr-2">{item.icon}</span>
                     {item.label}
                   </Link>
                 ))}
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4 hidden sm:block">
                {isDevMode() ? '🔧 ' : ''}{displayName}
              </span>
              <button onClick={handleLogout} className="btn btn-secondary text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
