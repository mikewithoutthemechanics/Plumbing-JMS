import SessionHandler from '@/components/auth/SessionHandler';

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--plumber-primary)] mx-auto mb-4" />
        <p className="text-gray-600">Completing sign in…</p>
        <SessionHandler />
      </div>
    </div>
  );
}
