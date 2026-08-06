'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // The OAuth callback is handled by Supabase automatically
    // Redirect to the intended page or dashboard
    router.push('/dashboard');
  }, [router]);

  return null; // This page doesn't render anything
}
