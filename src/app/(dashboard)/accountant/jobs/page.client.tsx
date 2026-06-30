'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils/calculations';
import type { JobCard } from '@/types';

interface Props {
  initialJobs: (JobCard & { customer?: { name: string }; assigned_to_profile?: { full_name: string } })[];
}

export default function AccountantJobsClient({ initialJobs }: Props) {
  const [jobs, setJobs] = useState(initialJobs);

  useEffect(() => {
    const channel = supabase
      .channel('accountant-jobs')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'job_cards' },
        () => {
          supabase
            .from('job_cards')
            .select(`
              *,
              customer:customers(name),
              assigned_to_profile:profiles!job_cards_assigned_to_fkey(full_name)
            `)
            .in('status', ['completed', 'invoiced'])
            .order('invoiced_at', { ascending: false })
            .then(({ data }) => data && setJobs(data));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Financial Records</h1>

      <div className="grid gap-4">
        {jobs.map((job) => (
          <div key={job.id} className="card p-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm font-semibold text-blue-600">{job.job_number}</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {job.status}
                  </span>
                </div>
                <p className="text-gray-900 font-medium">{job.description}</p>
                <p className="text-sm text-gray-500">
                  {job.customer?.name} • {job.assigned_to_profile?.full_name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(job.grand_total)}
                </p>
                <p className="text-xs text-gray-400">
                  {job.invoiced_at ? formatDateTime(job.invoiced_at) : 'Not invoiced'}
                </p>
              </div>
            </div>
          </div>
        ))}

        {jobs.length === 0 && (
          <div className="card p-8 text-center text-gray-500">
            No completed or invoiced jobs available.
          </div>
        )}
      </div>
    </div>
  );
}
