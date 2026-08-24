'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils/calculations';
import { JOB_STATE_LABELS, JOB_STATES } from '@/lib/constants/job-states';
import type { JobCard, Customer, Profile, BankingDetails } from '@/types';
import StateControls from '@/components/job-card/StateControls';
import type { JobState } from '@/types';
import toast from 'react-hot-toast';

type AdminJobCard = JobCard & {
  customer?: { name: string };
  assigned_to_profile?: { full_name: string; email: string };
};

interface Props {
  initialJobs: AdminJobCard[];
}

export default function AdminJobsClient({ initialJobs }: Props) {
  const router = useRouter();
  const [jobs, setJobs] = useState<AdminJobCard[]>(initialJobs);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [banking, setBanking] = useState<BankingDetails | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    job_number: '',
    customer_id: '',
    description: '',
    admin_hourly_rate: '',
    admin_notes: '',
    assigned_to: '',
  });
  const refreshJobs = async () => {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
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
      const { supabase } = await import('@/lib/supabase/client');
      if (!supabase) return;
      const [custRes, techRes, bankRes] = await Promise.all([
        supabase.from('customers').select('id, name, address, created_at, updated_at').order('name'),
        supabase.from('profiles').select('id, full_name, email, role, created_at, updated_at').eq('role', 'technician'),
        supabase.from('banking_details').select('*').eq('is_active', true).single(),
      ]);
      if (custRes.data) setCustomers(custRes.data as Customer[]);
      if (techRes.data) setTechnicians(techRes.data as Profile[]);
      const bankingData = (bankRes as { data?: BankingDetails }).data;
      if (bankingData) setBanking(bankingData);
    };
    initData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) {
      setLoading(false);
      return;
    }
    const jobData = {
      job_number: formData.job_number.trim() || `JOB-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      customer_id: formData.customer_id,
      description: formData.description,
      admin_hourly_rate: parseFloat(formData.admin_hourly_rate),
      admin_notes: formData.admin_notes,
      assigned_to: formData.assigned_to || null,
      status: formData.assigned_to ? 'assigned' : 'pending',
      created_by: (await supabase.auth.getSession()).data.session?.user?.id,
    };
    const { error } = await supabase.from('job_cards').insert(jobData as unknown as { [key: string]: unknown });
    if (error) toast.error('Error: ' + error.message);
    else {
      if (formData.assigned_to) {
        fetch('/api/notifications', { method: 'POST' }).catch(() => {});
      }
      setShowCreateModal(false);
      setFormData({ job_number: '', customer_id: '', description: '', admin_hourly_rate: '', admin_notes: '', assigned_to: '' });
      refreshJobs();
    }
    setLoading(false);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientLoading(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) { setClientLoading(false); return; }
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: clientForm.name,
        email: clientForm.email || null,
        phone: clientForm.phone || null,
        address: clientForm.address,
        notes: clientForm.notes || null,
      } as unknown as { [key: string]: unknown })
      .select()
      .single();
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      setCustomers([...customers, data as Customer]);
      setFormData({ ...formData, customer_id: (data as Customer).id });
      setShowClientModal(false);
      setClientForm({ name: '', email: '', phone: '', address: '', notes: '' });
    }
    setClientLoading(false);
  };

  const advanceState = async (jobId: string, newStatus: JobState) => {
    setLoading(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/jobs', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ job_id: jobId, status: newStatus })
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error('Error: ' + (err.error || 'Failed to update'));
    } else {
      refreshJobs();
    }
    setLoading(false);
  };

  const sendToAccountant = async (job: AdminJobCard) => {
    if (!banking) {
      toast.error('No banking details configured. Please set up banking details first.');
      return;
    }
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ jobIds: [job.id] }),
      });
      if (response.ok) {
        toast.error(`Job ${job.job_number} sent to accountant via email.`);
      } else {
        const err = await response.json();
        toast.error('Error: ' + err.error);
      }
    } catch (err) {
      toast.error('Failed to send: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    setLoading(false);
  };

  const filteredJobs = filterStatus === 'all' ? jobs : jobs.filter(j => j.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-[var(--plumber-primary)] to-[var(--plumber-accent)]">
          Job Cards
        </h1>
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
          <div
            key={job.id}
            onClick={() => router.push(`/admin/jobs/${job.id}`)}
            className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
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

              <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
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
                <label className="label">Job Number (optional)</label>
                <input
                  type="text"
                  value={formData.job_number}
                  onChange={(e) => setFormData({ ...formData, job_number: e.target.value })}
                  className="input"
                  placeholder="e.g. PLB-2026-001 (auto-generated if blank)"
                />
              </div>

              <div>
                <label className="label">Customer</label>
                <div className="flex gap-2">
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
                  <button
                    type="button"
                    onClick={() => setShowClientModal(true)}
                    className="btn btn-secondary whitespace-nowrap"
                  >
                    + New Client
                  </button>
                </div>
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

      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">New Client</h2>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input type="text" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input type="tel" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Address</label>
                <textarea value={clientForm.address} onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} className="input" rows={2} required />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} className="input" rows={2} />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary flex-1" disabled={clientLoading}>
                  {clientLoading ? 'Saving...' : 'Save Client'}
                </button>
                <button type="button" onClick={() => setShowClientModal(false)} className="btn btn-secondary">
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
