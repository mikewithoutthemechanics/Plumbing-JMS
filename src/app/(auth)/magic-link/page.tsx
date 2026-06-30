'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function MagicLinkContent() {
  const email = useSearchParams().get('email');
  const hasEmail = !!email;

  if (!hasEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">No email provided</p>
          <a href="/login" className="btn btn-primary inline-block">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-8 text-center max-w-md">
        <div className="text-green-500 text-4xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Magic Link Sent</h1>
        <p className="text-gray-600 mb-2">
          We&apos;ve sent a login link to <strong>{email}</strong>
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Check your email and click the link to sign in.
        </p>
        <a href="/login" className="btn btn-secondary inline-block">
          Back to Login
        </a>
      </div>
    </div>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="card p-8">Loading...</div></div>}>
      <MagicLinkContent />
    </Suspense>
  );
}
