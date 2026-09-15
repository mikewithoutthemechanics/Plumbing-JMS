'use client';

import { useState, useEffect } from 'react';
import { calculateHours, formatDateTime } from '@/lib/utils/calculations';
import type { JobCard } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  initialJobs: JobCard[];
  userId: string;
}

export default function TimeLogger({ initialJobs, userId }: Props) {
  const [jobs, setJobs] = useState(initialJobs);
  const [logs, setLogs] = useState<{ job_card_id: string; clock_in: string; clock_out?: string; id?: string }[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      const { supabase } = await import('@/lib/supabase/client');
      if (!supabase) return;
      const { data } = await supabase
        .from('time_logs')
        .select('*')
        .eq('technician_id', userId)
        .order('clock_in', { ascending: false });
      if (data) setLogs(data);
    };
    fetchLogs();
  }, [userId]);

  const clockIn = async (jobId: string) => {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const logData = {
      job_card_id: jobId,
      technician_id: userId,
      clock_in: new Date().toISOString(),
      hours: 0,
      is_paused: false,
    };
    const { error } = await supabase.from('time_logs').insert(logData as unknown as { [key: string]: unknown });
    if (error) toast.error('Error: ' + error.message);
    else {
      setActiveJobId(jobId);
      refresh();
    }
  };

  const clockOut = async (jobId: string) => {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const { data: log } = await supabase
      .from('time_logs')
      .select('*')
      .eq('job_card_id', jobId)
      .eq('technician_id', userId)
      .is('clock_out', null)
      .single();

    if (!log) {
      toast.error('No active clock-in found');
      return;
    }

    const logData = log as unknown as { clock_in: string; id: string };
    const hours = calculateHours(logData.clock_in, new Date().toISOString());
    const { error } = await supabase
      .from('time_logs')
      .update({ clock_out: new Date().toISOString(), hours } as unknown as { [key: string]: unknown })
      .eq('id', logData.id);

    if (error) toast.error('Error: ' + error.message);
    else {
      setActiveJobId(null);
      refresh();
    }
  };

  const refresh = async () => {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const { data } = await supabase
      .from('job_cards')
      .select('*')
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false });
    if (data) setJobs(data);
  };

  const activeLog = logs.find(l => !l.clock_out) ?? null;

  const totalToday = logs.reduce((sum, l) => sum + (l.clock_out ? calculateHours(l.clock_in, l.clock_out) : calculateHours(l.clock_in, new Date().toISOString())), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Time Logger</h1>
        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{totalToday.toFixed(2)}h today • {logs.length} logs</span>
      </div>
      {activeLog && <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">● On the clock — {jobs.find(j => j.id === activeLog.job_card_id)?.job_number || 'Unknown'} • Tap the same card to clock out. Completing the job requires hours logged.</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-1">Active Jobs — Tap to Clock In/Out</h3>
          <p className="text-xs text-gray-500 mb-4">One tap starts the job (auto moves Assigned → In Progress). Hours feed the invoice automatically.</p>
          <div className="space-y-2">
            {jobs
              .filter(j => ['assigned', 'in_progress', 'completed', 'to_be_invoiced'].includes(j.status))
              .map((job) => (
                <div
                  key={job.id}
                  onClick={() => {
                    if (activeLog?.job_card_id === job.id) {
                      clockOut(job.id);
                    } else if (!activeLog) {
                      clockIn(job.id);
                    }
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    activeLog?.job_card_id === job.id
                      ? 'border-red-500 bg-red-50 shadow-sm'
                      : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                  } ${activeLog && activeLog?.job_card_id !== job.id ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-blue-600">{job.job_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${job.status === 'in_progress' ? 'bg-violet-100 text-violet-700' : job.status === 'assigned' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{job.status.replace('_',' ')}</span>
                  </div>
                  <div className="text-sm text-gray-700 line-clamp-2 mt-1">{job.description}</div>
                  {activeLog?.job_card_id === job.id ? (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="flex-1 text-xs text-red-600 font-semibold">● CLOCKED IN — Tap to clock out</span>
                      <span className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-full font-bold">Clock Out</span>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs font-medium text-blue-600">Tap to Clock In →</div>
                  )}
                </div>
              ))}
            {jobs.filter(j => ['assigned','in_progress','completed','to_be_invoiced'].includes(j.status)).length === 0 && (
              <div className="p-6 text-center text-sm text-gray-500 border border-dashed rounded-lg">No active jobs — ask owner to assign you.</div>
            )}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Today&apos;s Time Logs</h3>
          <div className="space-y-2">
            {logs.slice(0, 10).map((log) => {
              const job = jobs.find(j => j.id === log.job_card_id);
              const hours = log.clock_out ? calculateHours(log.clock_in, log.clock_out) : calculateHours(log.clock_in, new Date().toISOString());
              return (
                <div key={log.job_card_id + log.clock_in} className="p-3 rounded-lg bg-gray-50">
                  <div className="font-mono text-sm">{job?.job_number || 'Unknown'}</div>
                  <div className="text-xs text-gray-500">
                    {formatDateTime(log.clock_in)} → {log.clock_out ? formatDateTime(log.clock_out) : 'Now'}
                  </div>
                  <div className="text-sm font-medium mt-1">
                    {hours.toFixed(2)} hours
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
