'use client';

import { JOB_STATE_LABELS, JOB_STATE_TRANSITIONS } from '@/lib/constants/job-states';
import type { JobState } from '@/types';

interface Job {
  id: string;
  status: JobState;
}

interface Props {
  job: Job;
  onAdvance: (jobId: string, newStatus: JobState) => void;
  loading: boolean;
}

export default function StateControls({ job, onAdvance, loading }: Props) {
  const remaining = JOB_STATE_TRANSITIONS[job.status] || [];

  if (remaining.length === 0) {
    return (
      <div className="card p-4">
        <p className="text-sm text-gray-500">This job is fully processed. All steps complete.</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-gray-900 mb-3">Advance Job</h3>
      <div className="flex flex-wrap gap-2">
        {remaining.map((nextState) => (
          <button
            key={nextState}
            onClick={() => onAdvance(job.id, nextState)}
            className="btn btn-primary"
            disabled={loading}
          >
            Mark as {JOB_STATE_LABELS[nextState]}
          </button>
        ))}
      </div>
    </div>
  );
}
