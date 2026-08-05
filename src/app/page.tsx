import { redirect } from 'next/navigation';
import AuthCallback from '@/components/auth/AuthCallback';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const sp = await searchParams;
  if (sp?.code) {
    return <AuthCallback />;
  }
  redirect('/login');
}
