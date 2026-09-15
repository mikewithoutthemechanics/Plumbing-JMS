'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { JOB_STATE_LABELS } from '@/lib/constants/job-states';
import { calculateJobTotals } from '@/lib/utils/calculations';
import type { JobCard, JobMaterialRow, JobTender, JobSignature } from '@/types';
import StateControls from '@/components/job-card/StateControls';
import MaterialSelector from '@/components/material-picker/MaterialSelector';
import SignaturePad from '@/components/job-card/SignaturePad';
import TenderUploadSection from '@/components/job-card/TenderUploadSection';
import MaterialsTable from '@/components/job-card/MaterialsTable';
import JobFinancePanel from '@/components/job-card/JobFinancePanel';
import type { JobState } from '@/types';

interface Props {
  job: JobCard & { customer?: { name: string }; assigned_to_profile?: { full_name: string } };
  materials: JobMaterialRow[];
  tenders: JobTender[];
  signatures: JobSignature[];
  canManage: boolean;
  onUpdate: () => void;
  onAdvance: (jobId: string, newStatus: JobState) => void;
  loading: boolean;
}

export default function JobCardDetail({
  job,
  materials,
  tenders,
  signatures,
  canManage,
  onUpdate,
  onAdvance,
  loading,
}: Props) {
  const router = useRouter();
  const [signatoryName, setSignatoryName] = useState('');

  // Live totals from materials only (labor hrs removed — invoice is materials + work done)
  const liveTotals = useMemo(() => {
    const mats = materials.map(m => ({ unitPrice: (m as unknown as { admin_unit_price?: number }).admin_unit_price || 0, quantity: m.quantity || 0 }));
    return calculateJobTotals(0, 0, mats);
  }, [materials]);

  const triggerRecalc = async () => {
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const s = supabase ? (await supabase.auth.getSession()).data.session : null;
      await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.access_token ?? ''}` },
        body: JSON.stringify({ job_id: job.id, recalc: true }),
      });
    } catch {}
  };

  const toggleFlag = async (material: JobMaterialRow, field: 'bought' | 'claimed') => {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const newValue = !material[field];
    const update: Record<string, unknown> = { [field]: newValue };
    update[field === 'bought' ? 'bought_at' : 'claimed_at'] = newValue ? new Date().toISOString() : null;
    const { error } = await supabase.from('job_materials').update(update as unknown as { [key: string]: unknown }).eq('id', material.id);
    if (error) alert('Error: ' + error.message);
    else onUpdate();
  };

  const saveSignature = async (dataUrl: string) => {
    if (!canManage) return;
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const { error } = await supabase.from('job_signatures').insert({
      job_card_id: job.id,
      customer_id: job.customer_id,
      signatory_name: signatoryName || null,
      signature_data: dataUrl,
    } as unknown as { [key: string]: unknown });
    if (error) alert('Error: ' + error.message);
    else onUpdate();
  };

  const removeMaterial = async (materialId: string) => {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const { error } = await supabase.from('job_materials').delete().eq('id', materialId);
    if (error) alert('Error: ' + error.message);
    else {
      await triggerRecalc();
      onUpdate();
    }
  };

  const existingSignature = signatures[signatures.length - 1];

  const handleDeleteJob = async () => {
    if (!confirm(`Delete job ${job.job_number}? This will delete its materials, time logs and invoices. Cannot be undone.`)) return;
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    const qs = job.status === 'invoiced' ? `?id=${job.id}&force=true` : `?id=${job.id}`;
    const res = await fetch(`/api/jobs${qs}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(data.error || 'Failed to delete');
    else {
      toast.success('Job deleted');
      router.push('/admin/jobs');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="font-mono text-sm font-semibold text-blue-600">{job.job_number}</span>
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {JOB_STATE_LABELS[job.status]}
        </span>
        {canManage && (
          <button onClick={handleDeleteJob} className="ml-auto text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200">
            Delete Job
          </button>
        )}
      </div>

      <div className="card p-4">
        <h2 className="font-semibold text-gray-900 mb-2">Job Details</h2>
        <p className="text-gray-600">{job.description}</p>
        <p className="text-sm text-gray-500 mt-2">Customer: {job.customer?.name || 'Unknown'}</p>
        {job.assigned_to_profile && (
          <p className="text-sm text-gray-500">Assigned to: {job.assigned_to_profile.full_name}</p>
        )}
        {job.admin_notes && canManage && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800"><strong>Admin Notes:</strong> {job.admin_notes}</p>
          </div>
        )}
        {(canManage && (job.grand_total > 0 || liveTotals.grandTotal > 0)) && (
          <p className="text-sm text-gray-700 mt-3 font-medium">
            Total (materials + VAT): {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(liveTotals.grandTotal > 0 ? liveTotals.grandTotal : job.grand_total)}{liveTotals.grandTotal !== job.grand_total && liveTotals.grandTotal > 0 ? <span className="text-xs text-blue-600 ml-2">(live: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(liveTotals.grandTotal)})</span> : null}
          </p>
        )}
      </div>

      {/* Finance / Invoice tab - owners only */}
      {canManage && <JobFinancePanel jobId={job.id} />}

      {/* Tender / framework upload */}
      <TenderUploadSection
        jobId={job.id}
        tenders={tenders}
        onUpdate={onUpdate}
        canManage={canManage}
      />

      {/* Materials: tech qty, owner price */}
      <MaterialsTable
        materials={materials}
        canManage={canManage}
        onToggleFlag={toggleFlag}
        onRemoveMaterial={removeMaterial}
        onUpdate={onUpdate}
      />

      {canManage && (
        <MaterialSelector
          jobId={job.id}
          onAddMaterial={async (jobId, materialId, quantity) => {
            const { supabase } = await import('@/lib/supabase/client');
            if (!supabase) return;
            const { data: material } = await supabase.from('materials').select('admin_unit_price').eq('id', materialId).single();
            const price = (material as { admin_unit_price: number } | null)?.admin_unit_price || 0;
            const { error } = await supabase.from('job_materials').insert({
              job_card_id: jobId, material_id: materialId, quantity, admin_unit_price: price, line_total: price * quantity,
             } as unknown as { [key: string]: unknown });
             if (error) alert('Error: ' + error.message);
             else { await triggerRecalc(); onUpdate(); }
           }}
           onAddCustom={async (jobId, name, quantity) => {
             const { supabase } = await import('@/lib/supabase/client');
             if (!supabase) return;
             const { error } = await supabase.from('job_materials').insert({
               job_card_id: jobId, custom_name: name, quantity, admin_unit_price: 0, line_total: 0,
             } as unknown as { [key: string]: unknown });
            if (error) alert('Error: ' + error.message);
            else { await triggerRecalc(); onUpdate(); }
          }}
          loading={loading}
        />
      )}

      {canManage && (
        <StateControls job={job} onAdvance={onAdvance} loading={loading} />
      )}

      {job.status === 'completed' || job.status === 'to_be_invoiced' || job.status === 'invoiced' ? (
        <SignaturePad
          signatoryName={signatoryName}
          onNameChange={setSignatoryName}
          savedSignature={existingSignature?.signature_data}
          onSave={saveSignature}
          disabled={!canManage || !!existingSignature}
        />
      ) : null}
    </div>
  );
}
