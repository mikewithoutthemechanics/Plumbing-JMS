'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { calculateHours, formatDateTime } from '@/lib/utils/calculations';
import type { JobCard } from '@/types';

interface Props {
  initialJobs: JobCard[];
  userId: string;
}

export default function TimeLogger({ initialJobs, userId }: Props) {
  const [jobs, setJobs] = useState(initialJobs);
  const [logs, setLogs] = useState<{ job_id: string; clock_in: string; clock_out?: string; id?: string }[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
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
    const { error } = await supabase.from('time_logs').insert({
      job_card_id: jobId,
      technician_id: userId,
      clock_in: new Date().toISOString(),
      hours: 0,
      is_paused: false,
    });
    if (error) alert('Error: ' + error.message);
    else {
      setActiveJobId(jobId);
      refresh();
    }
  };

  const clockOut = async (jobId: string) => {
    const { data: log } = await supabase
      .from('time_logs')
      .select('*')
      .eq('job_card_id', jobId)
      .eq('technician_id', userId)
      .is('clock_out', null)
      .single();

    if (!log) {
      alert('No active clock-in found');
      return;
    }

    const hours = calculateHours(log.clock_in, new Date().toISOString());
    const { error } = await supabase
      .from('time_logs')
      .update({
        clock_out: new Date().toISOString(),
        hours,
      })
      .eq('id', log.id);

    if (error) alert('Error: ' + error.message);
    else {
      setActiveJobId(null);
      refresh();
    }
  };

  const refresh = async () => {
    const { data } = await supabase
      .from('job_cards')
      .select('*')
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false });
    if (data) setJobs(data);
  };

  const activeLog = logs.find(l => l.job_id === activeJobId && !l.clock_out);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Time Logger</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Active Jobs — Tap to Clock In</h3>
          <div className="space-y-2">
            {jobs
              .filter(j => ['assigned', 'in_progress'].includes(j.status))
              .map((job) => (
                <div
                  key={job.id}
                  onClick={() => {
                    if (activeLog?.job_id === job.id) {
                      clockOut(job.id);
                    } else if (!activeLog) {
                      clockIn(job.id);
                    }
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    activeLog?.job_id === job.id
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                  } ${activeLog && activeLog?.job_id !== job.id ? 'opacity-50' : ''}`}
                >
                  <div className="font-mono text-sm">{job.job_number}</div>
                  <div className="text-sm text-gray-600">{job.description}</div>
                  {activeLog?.job_id === job.id && (
                    <div className="text-xs text-red-600 font-medium mt-1">
                      ● CLOCKED IN — Tap to clock out
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Today&apos;s Time Logs</h3>
          <div className="space-y-2">
            {logs.slice(0, 10).map((log) => {
              const job = jobs.find(j => j.id === log.job_id);
              const hours = log.clock_out ? calculateHours(log.clock_in, log.clock_out) : calculateHours(log.clock_in, new Date().toISOString());
              return (
                <div key={log.job_id + log.clock_in} className="p-3 rounded-lg bg-gray-50">
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
