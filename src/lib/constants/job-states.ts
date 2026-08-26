export const JOB_STATES = ['pending', 'assigned', 'in_progress', 'completed', 'to_be_invoiced', 'invoiced'] as const;

export type JobState = typeof JOB_STATES[number];

export const JOB_STATE_LABELS: Record<JobState, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  to_be_invoiced: 'To Be Invoiced',
  invoiced: 'Invoiced',
};

export const JOB_STATE_TRANSITIONS: Record<JobState, JobState[]> = {
  pending: ['assigned'],
  assigned: ['in_progress', 'completed'],
  in_progress: ['completed'],
  completed: ['to_be_invoiced'],
  to_be_invoiced: ['invoiced'],
  invoiced: [],
};

export const VAT_RATE = 0.15;

export const CURRENCY = 'ZAR';
