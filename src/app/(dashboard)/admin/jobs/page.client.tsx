'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils/calculations';
import { JOB_STATE_LABELS, JOB_STATES } from '@/lib/constants/job-states';
import type { JobCard, Customer, Profile, BankingDetails } from '@/types';
import StateControls from '@/components/job-card/StateControls';
import type { JobState } from '@/types';

type AdminJobCard = JobCard & {
  customer?: { name: string };
  assigned_to_profile?: { full_name: string; email: string };
};

interface Props {
  initialJobs: AdminJobCard[];
}

export default function AdminJobsClient({ initialJobs }: Props) {
  const [jobs, setJobs] = useState<AdminJobCard[]>(initialJobs);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [banking, setBanking] = useState<BankingDetails | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    customer_id: '',
    description: '',
    admin_hourly_rate: '',
    admin_notes: '',
    assigned_to: '',
  });
  const refreshJobs = async () => {
    const { data } = await supabase
      .from('job_cards')
      .select(`
        *,
        customer:customers(name),
        assigned_to_profile:profiles!job_cards_assigned_to_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false });
    if (data) setJobs(data as AdminJobCard[]);
  };

  useEffect(() => {
    const initData = async () => {
      const [custRes, techRes, bankRes] = await Promise.all([
        supabase.from('customers').select('id, name, address, created_at, updated_at').order('name'),
        supabase.from('profiles').select('id, full_name, email, role, created_at, updated_at').eq('role', 'technician'),
        supabase.from('banking_details').select('*').eq('is_active', true).single(),
      ]);
      if (custRes.data) setCustomers(custRes.data as Customer[]);
      if (techRes.data) setTechnicians(techRes.data as Profile[]);
      if (bankRes.data) setBanking(bankRes.data as BankingDetails);
    };
    initData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('job_cards').insert({
      customer_id: formData.customer_id,
      description: formData.description,
      admin_hourly_rate: parseFloat(formData.admin_hourly_rate),
      admin_notes: formData.admin_notes,
      assigned_to: formData.assigned_to || null,
      status: formData.assigned_to ? 'assigned' : 'pending',
    });
    if (error) alert('Error: ' + error.message);
    else {
      setShowCreateModal(false);
      setFormData({ customer_id: '', description: '', admin_hourly_rate: '', admin_notes: '', assigned_to: '' });
      refreshJobs();
    }
    setLoading(false);
  };

  const advanceState = async (jobId: string, newStatus: JobState) => {
    setLoading(true);
    const { error } = await supabase.from('job_cards').update({ status: newStatus }).eq('id', jobId);
    if (error) alert('Error: ' + error.message);
    else refreshJobs();
    setLoading(false);
  };

  const sendToAccountant = async (job: AdminJobCard) => {
    if (!banking) {
      alert('No banking details configured. Please set up banking details first.');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ jobIds: [job.id] }),
      });
      if (response.ok) {
        alert(`Job ${job.job_number} sent to accountant via email.`);
      } else {
        const err = await response.json();
        alert('Error: ' + err.error);
      }
    } catch (err) {
      alert('Failed to send: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    setLoading(false);
  };

  const filteredJobs = filterStatus === 'all' ? jobs : jobs.filter(j => j.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Job Cards</h1>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          + New Job Card
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterStatus === 'all'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({jobs.length})
        </button>
        {[...JOB_STATES].map((state) => (
          <button
            key={state}
            onClick={() => setFilterStatus(state)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === state
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {JOB_STATE_LABELS[state]} ({jobs.filter(j => j.status === state).length})
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredJobs.map((job) => (
          <div key={job.id} className="card p-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm font-semibold text-blue-600">{job.job_number}</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {JOB_STATE_LABELS[job.status]}
                  </span>
                </div>
                <p className="text-gray-900 font-medium">{job.description}</p>
                <p className="text-gray-500 text-sm mt-1">Customer: {job.customer?.name || 'Unknown'}</p>
                {job.assigned_to_profile && (
                  <p className="text-gray-500 text-sm">Assigned to: {job.assigned_to_profile.full_name}</p>
                )}
                <p className="text-gray-400 text-xs mt-2">{formatDateTime(job.created_at)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {job.status !== 'invoiced' && (
                  <StateControls job={job as JobCard & { status: JobState }} onAdvance={advanceState} loading={loading} />
                )}
                {job.status === 'invoiced' && (
                  <button
                    onClick={() => sendToAccountant(job)}
                    className="btn btn-secondary text-sm"
                    disabled={loading}
                  >
                    Send to Accountant
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredJobs.length === 0 && (
          <div className="card p-8 text-center text-gray-500">
            No job cards found. Create your first job card to get started.
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Job Card</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Customer</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={3}
                  required
                  placeholder="Describe the job..."
                />
              </div>

              <div>
                <label className="label">Hourly Rate (ZAR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.admin_hourly_rate}
                  onChange={(e) => setFormData({ ...formData, admin_hourly_rate: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Assign to Technician (optional)</label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="input"
                >
                  <option value="">Unassigned</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Admin Notes (private)</label>
                <textarea
                  value={formData.admin_notes}
                  onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Job'}
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
