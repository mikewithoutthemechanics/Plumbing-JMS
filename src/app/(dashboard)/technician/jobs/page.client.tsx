'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { JOB_STATE_LABELS } from '@/lib/constants/job-states';
import type { JobCard, JobMaterial, JobState } from '@/types';
import MaterialSelector from '@/components/material-picker/MaterialSelector';
import JobMaterialsList from '@/components/job-card/JobMaterialsList';
import StateControls from '@/components/job-card/StateControls';

interface Props {
  initialJobs: (JobCard & { customer?: { name: string }; job_materials?: JobMaterial[] })[];
  userId: string;
}

export default function TechnicianJobsClient({ initialJobs, userId }: Props) {
  const [jobs, setJobs] = useState(initialJobs);
  const [selectedJob, setSelectedJob] = useState<(JobCard & { customer?: { name: string }; job_materials?: JobMaterial[] }) | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [loading, setLoading] = useState(false);

  const refreshJobs = async () => {
    const { data } = await supabase
      .from('job_cards')
      .select(`
        *,
        customer:customers(name),
        job_materials(*)
      `)
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false });
    if (data) setJobs(data);
  };

  const selectJob = (job: JobCard & { customer?: { name: string }; job_materials?: JobMaterial[] }) => {
    setSelectedJob(job);
    setView('detail');
  };

  const advanceState = async (jobId: string, newStatus: JobState) => {
    setLoading(true);
    const { error } = await supabase.from('job_cards').update({ status: newStatus }).eq('id', jobId);
    if (error) alert('Error: ' + error.message);
    else if (selectedJob?.id === jobId) {
      setSelectedJob({ ...selectedJob, status: newStatus });
    }
    refreshJobs();
    setLoading(false);
  };

  const addMaterial = async (jobId: string, materialId: string, quantity: number) => {
    setLoading(true);
    const { data: material } = await supabase.from('materials').select('admin_unit_price').eq('id', materialId).single();
    if (!material) {
      alert('Material not found');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('job_materials')
      .insert({
        job_card_id: jobId,
        material_id: materialId,
        quantity,
        admin_unit_price: material.admin_unit_price,
        line_total: material.admin_unit_price * quantity,
      })
      .select()
      .single();
    if (error) alert('Error: ' + error.message);
    else {
      const { data: current } = await supabase.from('job_cards').select('materials_cost').eq('id', jobId).single();
      const newCost = (current?.materials_cost || 0) + data.line_total;
      const { error: updateError } = await supabase.from('job_cards').update({ materials_cost: newCost }).eq('id', jobId);
      if (updateError) alert('Error updating material cost: ' + updateError.message);
      if (selectedJob?.id === jobId) {
        setSelectedJob({
          ...selectedJob,
          job_materials: [...(selectedJob.job_materials || []), data],
        });
      }
      refreshJobs();
    }
    setLoading(false);
  };

  const addCustomMaterial = async (jobId: string, customName: string, quantity: number) => {
    setLoading(true);
    const { error } = await supabase.from('job_materials').insert({
      job_card_id: jobId,
      custom_name: customName,
      quantity,
      admin_unit_price: 0,
      line_total: 0,
    });
    if (error) alert('Error: ' + error.message);
    else refreshJobs();
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
          <p className="text-sm text-gray-500 mt-2">
            Customer: {selectedJob.customer?.name || 'Unknown'}
          </p>
          {selectedJob.admin_notes && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Admin Notes:</strong> {selectedJob.admin_notes}
              </p>
            </div>
          )}
        </div>

        <MaterialSelector
          jobId={selectedJob.id}
          onAddMaterial={addMaterial}
          onAddCustom={addCustomMaterial}
          loading={loading}
        />

          <JobMaterialsList
            materials={selectedJob.job_materials || []}
            onUpdate={refreshJobs}
          />

          <StateControls
            job={selectedJob}
            onAdvance={advanceState}
            loading={loading}
          />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>

      <div className="grid gap-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            onClick={() => selectJob(job)}
            className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm font-semibold text-blue-600">{job.job_number}</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {JOB_STATE_LABELS[job.status]}
                  </span>
                </div>
                <p className="text-gray-900 font-medium line-clamp-2">{job.description}</p>
                <p className="text-gray-500 text-sm mt-1">
                  {job.customer?.name || 'Unknown'}
                </p>
              </div>
              <div className="text-gray-400">→</div>
            </div>
          </div>
        ))}

        {jobs.length === 0 && (
          <div className="card p-8 text-center text-gray-500">
            No jobs assigned to you yet.
          </div>
        )}
      </div>
    </div>
  );
}
