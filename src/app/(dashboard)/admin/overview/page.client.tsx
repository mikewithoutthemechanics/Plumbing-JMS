'use client';

import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/utils/calculations';
import { JOB_STATE_LABELS } from '@/lib/constants/job-states';
import type { JobCard, AuditLog, Material } from '@/types';

interface Props {
  jobs?: JobCard[];
  recentAudits?: AuditLog[];
  lowStock?: Material[];
}

export default function AdminOverviewClient({ jobs: initialJobs = [], recentAudits: initialAudits = [], lowStock: initialLowStock = [] }: Props = {}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [recentAudits] = useState(initialAudits);
  const [lowStock] = useState(initialLowStock);
  const [autoAssign, setAutoAssign] = useState(false);
  const [autoNotify, setAutoNotify] = useState(false);

  useEffect(() => {
    import('@/lib/supabase/client').then(({ supabase }) => {
      if (!supabase) return;
      supabase
        .channel('admin-overview')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'job_cards' }, () => {
          supabase.from('job_cards').select('status, grand_total, created_at').order('created_at', { ascending: false }).limit(10)
            .then(({ data }) => data && setJobs(data as JobCard[]));
        })
        .subscribe();
    });
  }, []);

  const pending = jobs.filter(j => j.status === 'pending').length;
  const inProgress = jobs.filter(j => j.status === 'in_progress').length;
  const invoiced = jobs.filter(j => j.status === 'invoiced').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="text-sm text-gray-500">{new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-500">Total Jobs</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{jobs.length}</div>
          <div className="text-xs text-gray-400 mt-1">Latest activity</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="text-3xl font-bold text-yellow-600 mt-1">{pending}</div>
          <div className="text-xs text-gray-400 mt-1">Awaiting assignment</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-500">In Progress</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{inProgress}</div>
          <div className="text-xs text-gray-400 mt-1">Active work</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-500">Invoiced</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{invoiced}</div>
          <div className="text-xs text-gray-400 mt-1">Ready for accountant</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Automation Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-900">Auto-assign jobs</div>
                <div className="text-xs text-gray-500">Automatically assign new jobs to the least-busy technician</div>
              </div>
              <button
                onClick={() => setAutoAssign(!autoAssign)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoAssign ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoAssign ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-900">Auto-notify on completion</div>
                <div className="text-xs text-gray-500">Send email alert when a job is marked completed</div>
              </div>
              <button
                onClick={() => setAutoNotify(!autoNotify)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoNotify ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoNotify ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg opacity-75">
              <div>
                <div className="text-sm font-medium text-gray-900">Auto-deduct inventory</div>
                <div className="text-xs text-gray-500">Deduct materials from stock when job is invoiced</div>
              </div>
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">Always On</span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Alerts</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-500">All materials are well stocked.</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map(m => (
                <div key={m.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-900">{m.name}</span>
                  <span className={`font-medium ${m.quantity_on_hand === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {m.quantity_on_hand} {m.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Jobs</h2>
          <div className="space-y-2">
            {jobs.slice(0, 5).map((job, i) => (
              <div key={i} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium text-gray-900">{JOB_STATE_LABELS[job.status as keyof typeof JOB_STATE_LABELS] || job.status}</span>
                  <span className="text-gray-400 ml-2">{formatDateTime(job.created_at)}</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(job.grand_total || 0)}
                </span>
              </div>
            ))}
            {jobs.length === 0 && <p className="text-sm text-gray-500">No jobs yet.</p>}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {recentAudits.slice(0, 5).map((audit) => (
              <div key={audit.id || audit.record_id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium text-gray-900">{audit.table_name}</span>
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                    audit.action === 'INSERT' ? 'bg-green-100 text-green-700' :
                    audit.action === 'UPDATE' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>{audit.action}</span>
                </div>
                <span className="text-gray-400">{formatDateTime(audit.changed_at)}</span>
              </div>
            ))}
            {recentAudits.length === 0 && <p className="text-sm text-gray-500">No activity yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
