'use client';

import Link from 'next/link';

interface Props {
  initialJobs: unknown[];
  userId: string;
}

export default function TimeLogger(_props: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Time Log</h1>
      <div className="card p-6 text-center space-y-3">
        <p className="text-gray-600">Time tracking is handled by owner — you don&apos;t need to clock in/out.</p>
        <p className="text-sm text-gray-500">Just create the job card with customer + description + qty. Owner will add hours/prices and send the invoice to accountant.</p>
        <Link href="/technician/jobs" className="btn btn-primary inline-flex mt-2">Go to My Jobs →</Link>
      </div>
    </div>
  );
}
