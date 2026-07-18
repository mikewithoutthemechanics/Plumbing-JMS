'use client';

import { useState } from 'react';
import { JOB_STATE_LABELS } from '@/lib/constants/job-states';
import type { JobCard, JobMaterial, JobTender, JobSignature } from '@/types';
import StateControls from '@/components/job-card/StateControls';
import MaterialSelector from '@/components/material-picker/MaterialSelector';
import SignaturePad from '@/components/job-card/SignaturePad';
import type { JobState } from '@/types';

interface JobMaterialRow extends JobMaterial {
  materials?: { name: string };
}

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
  const [uploading, setUploading] = useState(false);
  const [signatoryName, setSignatoryName] = useState('');

  const uploadTender = async (file: File) => {
    setUploading(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) { setUploading(false); return; }
    const path = `${job.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('tenders').upload(path, file);
    if (error) { alert('Upload failed: ' + error.message); setUploading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error: dbErr } = await supabase.from('job_tenders').insert({
      job_card_id: job.id,
      file_name: file.name,
      file_path: path,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: user?.id,
    } as never);
    if (dbErr) alert('Upload failed: ' + dbErr.message);
    else onUpdate();
    setUploading(false);
  };

  const openTender = async (tender: JobTender) => {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const { data } = await supabase.storage.from('tenders').createSignedUrl(tender.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const toggleFlag = async (material: JobMaterialRow, field: 'bought' | 'claimed') => {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const newValue = !material[field];
    const update: Record<string, unknown> = { [field]: newValue };
    update[field === 'bought' ? 'bought_at' : 'claimed_at'] = newValue ? new Date().toISOString() : null;
    const { error } = await supabase.from('job_materials').update(update as never).eq('id', material.id);
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
    } as never);
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
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-gray-900">Tender / Job Framework</h3>
        <p className="text-sm text-gray-500">Upload the tender document to use as the framework for materials bought.</p>
        {canManage && (
          <div>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xls,.xlsx"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTender(f); }}
              disabled={uploading}
              className="block text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
            />
            {uploading && <span className="text-sm text-gray-400 ml-2">Uploading...</span>}
          </div>
        )}
        {tenders.length > 0 && (
          <ul className="space-y-1">
            {tenders.map((t) => (
              <li key={t.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm">{t.file_name}</span>
                <button onClick={() => openTender(t)} className="text-blue-600 hover:text-blue-800 text-sm">
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Materials with bought / claimed columns */}
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-gray-900">Materials List</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-3 py-2">Material</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Bought</th>
                <th className="px-3 py-2">Claimed</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {materials.map((m) => (
                <tr key={m.id} className="text-sm">
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {m.materials?.name || m.custom_name || 'Custom'}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{m.quantity}</td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={m.bought}
                      onChange={() => toggleFlag(m, 'bought')}
                      disabled={!canManage}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={m.claimed}
                      onChange={() => toggleFlag(m, 'claimed')}
                      disabled={!canManage}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {canManage && (
                      <button onClick={() => removeMaterial(m.id)} className="text-red-600 hover:text-red-800 text-xs">
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {materials.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-3 text-sm text-gray-500">No materials added yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
              } as never);
              if (error) alert('Error: ' + error.message);
              else onUpdate();
            }}
            onAddCustom={async (jobId, name, quantity) => {
              const { supabase } = await import('@/lib/supabase/client');
              if (!supabase) return;
              const { error } = await supabase.from('job_materials').insert({
                job_card_id: jobId, custom_name: name, quantity, admin_unit_price: 0, line_total: 0,
              } as never);
              if (error) alert('Error: ' + error.message);
              else onUpdate();
            }}
            loading={loading}
          />
        )}
      </div>

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
