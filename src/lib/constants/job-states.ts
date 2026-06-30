export const JOB_STATES = ['pending', 'assigned', 'in_progress', 'completed', 'invoiced'] as const;

export type JobState = typeof JOB_STATES[number];

export const JOB_STATE_LABELS: Record<JobState, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  invoiced: 'Invoiced',
};

export const JOB_STATE_TRANSITIONS: Record<JobState, JobState[]> = {
  pending: ['assigned'],
  assigned: ['in_progress'],
  in_progress: ['completed'],
  completed: ['invoiced'],
  invoiced: [],
};

export const VAT_RATE = 0.15;

export const CURRENCY = 'ZAR';
