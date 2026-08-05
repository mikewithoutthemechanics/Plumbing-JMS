'use client';

import { useState } from 'react';
import { JOB_STATE_LABELS } from '@/lib/constants/job-states';
import type { JobCard, JobMaterialRow, JobTender, JobSignature } from '@/types';
import StateControls from '@/components/job-card/StateControls';
import MaterialSelector from '@/components/material-picker/MaterialSelector';
import SignaturePad from '@/components/job-card/SignaturePad';
import TenderUploadSection from '@/components/job-card/TenderUploadSection';
import MaterialsTable from '@/components/job-card/MaterialsTable';
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
  const [signatoryName, setSignatoryName] = useState('');

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
    else onUpdate();
  };

  const existingSignature = signatures[signatures.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="font-mono text-sm font-semibold text-blue-600">{job.job_number}</span>
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {JOB_STATE_LABELS[job.status]}
        </span>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold text-gray-900 mb-2">Job Details</h2>
        <p className="text-gray-600">{job.description}</p>
        <p className="text-sm text-gray-500 mt-2">Customer: {job.customer?.name || 'Unknown'}</p>
        {job.assigned_to_profile && (
          <p className="text-sm text-gray-500">Assigned to: {job.assigned_to_profile.full_name}</p>
        )}
        {job.admin_notes && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800"><strong>Admin Notes:</strong> {job.admin_notes}</p>
          </div>
        )}
        {job.grand_total > 0 && (
          <p className="text-sm text-gray-700 mt-3 font-medium">
            Total: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(job.grand_total)}
          </p>
        )}
      </div>

      {/* Tender / framework upload */}
      <TenderUploadSection
        jobId={job.id}
        tenders={tenders}
        onUpdate={onUpdate}
        canManage={canManage}
      />

      {/* Materials with bought / claimed columns */}
      <MaterialsTable
        materials={materials}
        canManage={canManage}
        onToggleFlag={toggleFlag}
        onRemoveMaterial={removeMaterial}
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
             else onUpdate();
           }}
           onAddCustom={async (jobId, name, quantity) => {
             const { supabase } = await import('@/lib/supabase/client');
             if (!supabase) return;
             const { error } = await supabase.from('job_materials').insert({
               job_card_id: jobId, custom_name: name, quantity, admin_unit_price: 0, line_total: 0,
             } as unknown as { [key: string]: unknown });
            if (error) alert('Error: ' + error.message);
            else onUpdate();
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
