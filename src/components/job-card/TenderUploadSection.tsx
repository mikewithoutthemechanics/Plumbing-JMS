'use client';

import { useState } from 'react';
import type { JobTender } from '@/types';

interface Props {
  jobId: string;
  tenders: JobTender[];
  onUpdate: () => void;
  canManage: boolean;
}

/**
 * Tender / Job Framework upload section.
 *
 * Uploads tender documents to Supabase storage under `tenders/<jobId>/<timestamp>-<name>`
 * and records metadata in the `job_tenders` table. Non-managers can still browse
 * the uploaded tender list (read-only) — only the upload control is gated by canManage.
 */
export default function TenderUploadSection({
  jobId,
  tenders,
  onUpdate,
  canManage,
}: Props) {
  const [uploading, setUploading] = useState(false);

  const uploadTender = async (file: File) => {
    setUploading(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) { setUploading(false); return; }
    const path = `${jobId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('tenders').upload(path, file);
    if (error) { alert('Upload failed: ' + error.message); setUploading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error: dbErr } = await supabase.from('job_tenders').insert({
      job_card_id: jobId,
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

  return (
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
  );
}