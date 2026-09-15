'use client';

import { useState, useEffect } from 'react';
import { JOB_STATE_LABELS } from '@/lib/constants/job-states';
import type { JobCard, JobMaterial, JobState, Customer, TimeLog } from '@/types';
import { calculateHours } from '@/lib/utils/calculations';
import MaterialSelector from '@/components/material-picker/MaterialSelector';
import JobMaterialsList from '@/components/job-card/JobMaterialsList';
import StateControls from '@/components/job-card/StateControls';
import toast from 'react-hot-toast';

interface Props {
  initialJobs: (JobCard & { customer?: { name: string }; job_materials?: JobMaterial[] })[];
  userId: string;
  initialSelectedJobId?: string;
}

export default function TechnicianJobsClient({ initialJobs, userId, initialSelectedJobId }: Props) {
  const [jobs, setJobs] = useState(initialJobs);
  const [selectedJob, setSelectedJob] = useState<(JobCard & { customer?: { name: string }; job_materials?: JobMaterial[] }) | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ customer_id: '', description: '', technician_notes: '' });
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [clientLoading, setClientLoading] = useState(false);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [clockBusy, setClockBusy] = useState(false);

  useEffect(() => {
    if (!initialSelectedJobId) return;
    const found = jobs.find((j) => j.id === initialSelectedJobId);
    if (found && selectedJob?.id !== found.id) {
      setSelectedJob(found);
      setView('detail');
    }
  }, [initialSelectedJobId, jobs, selectedJob?.id]);

  useEffect(() => {
    const initCustomers = async () => {
      const { supabase } = await import('@/lib/supabase/client');
      if (!supabase) return;
      const { data } = await supabase.from('customers').select('id, name, address').order('name');
      if (data) setCustomers(data as Customer[]);
    };
    initCustomers();
  }, []);

  const refreshJobs = async () => {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    // Tech sees jobs assigned to them OR created by them (pending they created before owner assigns)
    const { data } = await supabase
      .from('job_cards')
      .select(`
        *,
        customer:customers(name),
        job_materials(*)
      `)
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (data) setJobs(data as any);
  };

  const selectJob = (job: JobCard & { customer?: { name: string }; job_materials?: JobMaterial[] }) => {
    setSelectedJob(job);
    setView('detail');
  };

  const loadTimeLogs = async (jobId: string) => {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const { data } = await supabase.from('time_logs').select('*').eq('job_card_id', jobId).order('clock_in', { ascending: false });
    if (data) setTimeLogs(data as TimeLog[]);
  };
  useEffect(() => { if (selectedJob?.id) loadTimeLogs(selectedJob.id); }, [selectedJob?.id]);

  const activeLog = timeLogs.find(l => !l.clock_out) ?? null;
  const totalHours = timeLogs.reduce((a, t) => a + (t.hours || 0) + (!t.clock_out ? calculateHours(t.clock_in, new Date().toISOString()) : 0), 0);

  const handleClockIn = async () => {
    if (!selectedJob) return;
    setClockBusy(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) { setClockBusy(false); return; }
    const { error } = await supabase.from('time_logs').insert({ job_card_id: selectedJob.id, technician_id: userId, clock_in: new Date().toISOString(), hours: 0 } as any);
    if (error) toast.error(error.message);
    else {
      toast.success('Clocked in — job in progress');
      if (selectedJob.status === 'assigned') await advanceState(selectedJob.id, 'in_progress');
      await loadTimeLogs(selectedJob.id);
    }
    setClockBusy(false);
  };
  const handleClockOut = async () => {
    if (!selectedJob || !activeLog) return;
    setClockBusy(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) { setClockBusy(false); return; }
    const hours = calculateHours(activeLog.clock_in, new Date().toISOString());
    const { error } = await supabase.from('time_logs').update({ clock_out: new Date().toISOString(), hours } as any).eq('id', activeLog.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${hours.toFixed(2)}h logged`);
      await loadTimeLogs(selectedJob.id);
      // trigger recalc so labour cost updates
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/jobs', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify({ job_id: selectedJob.id, recalc: true }) }).catch(()=>{});
      refreshJobs();
    }
    setClockBusy(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase/client');
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({
          customer_id: formData.customer_id,
          description: formData.description,
          technician_notes: formData.technician_notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || 'Failed to create job');
      else {
        toast.success('Job created - owner will add pricing');
        setShowCreateModal(false);
        setFormData({ customer_id: '', description: '', technician_notes: '' });
        refreshJobs();
      }
    } catch {
      toast.error('Network error');
    }
    setLoading(false);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientLoading(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) { setClientLoading(false); return; }
    const { data, error } = await supabase.from('customers').insert({
      name: clientForm.name,
      email: clientForm.email || null,
      phone: clientForm.phone || null,
      address: clientForm.address,
      notes: clientForm.notes || null,
    } as any).select().single();
    if (error) toast.error(error.message);
    else {
      setCustomers([...customers, data as Customer]);
      setFormData({ ...formData, customer_id: (data as Customer).id });
      setShowClientModal(false);
      setClientForm({ name: '', email: '', phone: '', address: '', notes: '' });
    }
    setClientLoading(false);
  };

  const advanceState = async (jobId: string, newStatus: JobState) => {
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const res = await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ job_id: jobId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || 'Failed to update job');
      else {
        if (selectedJob?.id === jobId) setSelectedJob({ ...selectedJob, status: newStatus, ...data.job });
        toast.success(`Job moved to ${newStatus.replace(/_/g, ' ')}`);
      }
    } catch { toast.error('Network error updating job'); }
    refreshJobs();
    setLoading(false);
  };

  const addMaterial = async (jobId: string, materialId: string, quantity: number) => {
    setLoading(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) { setLoading(false); return; }
    // Tech only sets qty - price stays 0 for owner to fill
    const { data, error } = await supabase.from('job_materials').insert({
      job_card_id: jobId,
      material_id: materialId,
      quantity,
      admin_unit_price: 0,
      line_total: 0,
    } as any).select().single();
    if (error) toast.error('Error: ' + error.message);
    else {
      toast.success('Quantity added - owner will set cost');
      if (selectedJob?.id === jobId) {
        const existingMaterials = selectedJob.job_materials || [];
        setSelectedJob({ ...selectedJob, job_materials: [...existingMaterials, data as JobMaterial] });
      }
      refreshJobs();
    }
    setLoading(false);
  };

  const addCustomMaterial = async (jobId: string, customName: string, quantity: number) => {
    setLoading(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) { setLoading(false); return; }
    const { error } = await supabase.from('job_materials').insert({
      job_card_id: jobId,
      custom_name: customName,
      quantity,
      admin_unit_price: 0,
      line_total: 0,
    } as any);
    if (error) toast.error('Error: ' + error.message);
    else {
      toast.success('Quantity added');
      refreshJobs();
    }
    setLoading(false);
  };

  if (view === 'detail' && selectedJob) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setView('list'); setSelectedJob(null); }} className="btn btn-secondary">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{selectedJob.job_number}</h1>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {JOB_STATE_LABELS[selectedJob.status]}
          </span>
        </div>

        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Job Details</h2>
          <p className="text-gray-600">{selectedJob.description}</p>
          <p className="text-sm text-gray-500 mt-2">Customer: {selectedJob.customer?.name || 'Unknown'}</p>
          {selectedJob.admin_notes && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800"><strong>Admin Notes:</strong> {selectedJob.admin_notes}</p>
            </div>
          )}
          {selectedJob.technician_notes && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800"><strong>Tech Notes:</strong> {selectedJob.technician_notes}</p>
            </div>
          )}
        </div>

        {/* One-tap In/Out — makes time tracking primary, not side trip */}
        <div className="card p-4 border-2 border-blue-100 bg-blue-50/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Time on Job</h3>
            <span className="text-sm font-bold text-blue-700 bg-white px-3 py-1 rounded-full border">{totalHours.toFixed(2)}h logged</span>
          </div>
          {activeLog ? (
            <button onClick={handleClockOut} disabled={clockBusy} className="w-full btn bg-red-600 hover:bg-red-700 text-white font-bold py-4 text-lg min-h-[56px] shadow-lg">
              {clockBusy ? 'Saving…' : `● Clock Out — ${calculateHours(activeLog.clock_in, new Date().toISOString()).toFixed(2)}h running`}
            </button>
          ) : (
            <button onClick={handleClockIn} disabled={clockBusy} className="w-full btn btn-primary font-bold py-4 text-lg min-h-[56px] shadow-lg">
              {clockBusy ? 'Starting…' : '▶ Clock In — Start Work'}
            </button>
          )}
          <p className="text-xs text-gray-500 mt-2 text-center">{activeLog ? 'Tap to stop — hours auto-feed invoice. Mark Complete after.' : 'One tap starts the clock + moves job to In Progress. Hours drive the invoice.'}</p>
          {timeLogs.length > 0 && (
            <div className="mt-3 space-y-1">
              {timeLogs.slice(0,3).map(l => (
                <div key={l.id} className="flex justify-between text-xs text-gray-600 bg-white px-2 py-1.5 rounded border">
                  <span>{new Date(l.clock_in).toLocaleString()} → {l.clock_out ? new Date(l.clock_out).toLocaleString() : 'now'}</span>
                  <span className="font-medium">{l.clock_out ? `${Number(l.hours||0).toFixed(2)}h` : `${calculateHours(l.clock_in, new Date().toISOString()).toFixed(2)}h •`}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <MaterialSelector jobId={selectedJob.id} onAddMaterial={addMaterial} onAddCustom={addCustomMaterial} loading={loading} />

        <JobMaterialsList materials={selectedJob.job_materials || []} onUpdate={refreshJobs} />

        <StateControls job={selectedJob} onAdvance={advanceState} loading={loading} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold px-6 py-3 min-h-[48px] shadow-[0_8px_20px_rgba(37,99,235,0.35)]">
          <span className="text-xl leading-none">+</span> New Job
        </button>
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => (
          <div key={job.id} onClick={() => selectJob(job)} className="card p-4 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm font-semibold text-blue-600">{job.job_number}</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{JOB_STATE_LABELS[job.status]}</span>
                </div>
                <p className="text-gray-900 font-medium line-clamp-2">{job.description}</p>
                <p className="text-gray-500 text-sm mt-1">{job.customer?.name || 'Unknown'}</p>
              </div>
              <div className="text-gray-400">→</div>
            </div>
          </div>
        ))}
        {jobs.length === 0 && (
          <div className="card p-8 text-center text-gray-500">
            No jobs yet. Tap + New Job to create one - owner will add pricing.
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden">
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary w-full inline-flex items-center justify-center gap-2 text-[17px] font-bold py-4 min-h-[56px] shadow-[0_8px_24px_rgba(37,99,235,0.4)]">
          <span className="text-2xl leading-none">+</span> New Job
        </button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">New Job (Tech)</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Customer</label>
                <div className="flex gap-2">
                  <select value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} className="input" required>
                    <option value="">Select customer...</option>
                    {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                  <button type="button" onClick={() => setShowClientModal(true)} className="btn btn-secondary whitespace-nowrap">+ New Client</button>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} required placeholder="What needs fixing?"/>
              </div>
              <div>
                <label className="label">Notes for owner</label>
                <textarea value={formData.technician_notes} onChange={(e) => setFormData({ ...formData, technician_notes: e.target.value })} className="input" rows={2} placeholder="Qty, site details..."/>
                <p className="text-xs text-gray-500 mt-1">Owner will add hourly rate & material costs. You won't see pricing.</p>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary flex-1" disabled={loading}>{loading ? 'Creating...' : 'Create Job'}</button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
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
              <div><label className="label">Name</label><input type="text" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} className="input" required /></div>
              <div><label className="label">Email</label><input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} className="input" /></div>
              <div><label className="label">Phone</label><input type="tel" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} className="input" /></div>
              <div><label className="label">Address</label><textarea value={clientForm.address} onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} className="input" rows={2} required /></div>
              <div><label className="label">Notes</label><textarea value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} className="input" rows={2} /></div>
              <div className="flex gap-3"><button type="submit" className="btn btn-primary flex-1" disabled={clientLoading}>{clientLoading ? 'Saving...' : 'Save Client'}</button><button type="button" onClick={() => setShowClientModal(false)} className="btn btn-secondary">Cancel</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
