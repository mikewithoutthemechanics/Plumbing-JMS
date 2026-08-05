'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import JobCardDetail from '@/components/job-card/JobCardDetail';
import type { JobCard, JobMaterial, JobTender, JobSignature } from '@/types';
import type { JobState } from '@/types';

interface JobMaterialRow extends JobMaterial {
  materials?: { name: string };
}

export default function AdminJobDetailClient({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<(JobCard & { customer?: { name: string }; assigned_to_profile?: { full_name: string } }) | null>(null);
  const [materials, setMaterials] = useState<JobMaterialRow[]>([]);
  const [tenders, setTenders] = useState<JobTender[]>([]);
  const [signatures, setSignatures] = useState<JobSignature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const [{ data: jobData }, { data: matData }, { data: tenderData }, { data: sigData }] = await Promise.all([
      supabase.from('job_cards').select('*, customer:customers(name), assigned_to_profile:profiles!job_cards_assigned_to_fkey(full_name)').eq('id', jobId).single(),
      supabase.from('job_materials').select('*, materials(name)').eq('job_card_id', jobId),
      supabase.from('job_tenders').select('*').eq('job_card_id', jobId).order('created_at', { ascending: false }),
      supabase.from('job_signatures').select('*').eq('job_card_id', jobId).order('created_at', { ascending: false }),
    ]);
    if (jobData) setJob(jobData as unknown as (JobCard & { customer?: { name: string }; assigned_to_profile?: { full_name: string } }));
    if (matData) setMaterials(matData as JobMaterialRow[]);
    if (tenderData) setTenders(tenderData as JobTender[]);
    if (sigData) setSignatures(sigData as JobSignature[]);
  }, [jobId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const advance = async (id: string, newStatus: JobState) => {
    setLoading(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) { setLoading(false); return; }
    const { error } = await supabase.from('job_cards').update({ status: newStatus } as unknown as { [key: string]: unknown }).eq('id', id);
    if (error) setError(error.message);
    else {
      if (newStatus === 'to_be_invoiced') {
        const res = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_card_id: id }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert('Invoice generation: ' + (err.error || 'failed'));
        }
      }
      await load();
    }
    setLoading(false);
  };

  if (error) return <div className="card p-4 text-red-600">{error}</div>;
  if (!job) return <div className="card p-8 text-center text-gray-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <button onClick={() => router.push('/admin/jobs')} className="btn btn-secondary">← Back to Jobs</button>
      <JobCardDetail
        job={job}
        materials={materials}
        tenders={tenders}
        signatures={signatures}
        canManage
        onUpdate={load}
        onAdvance={advance}
        loading={loading}
      />
    </div>
  );
}
