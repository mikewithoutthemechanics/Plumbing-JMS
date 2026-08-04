'use client';

import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Something went wrong' };

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  console.error('UI Error:', error);
  return (
    <section className="flex min-h-screen flex-col items-center justify-center py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl space-y-6 text-center">
        <h1 className="text-3xl font-bold text-red-600">Something went wrong</h1>
        <p className="text-gray-600">We're sorry, but an unexpected error occurred. Please try again later.</p>
        <button onClick={reset} className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          Try again
        </button>
      </div>
    </section>
  );
}