'use client';

import { useState } from 'react';
import type { StaffSchedule } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  busy: 'bg-yellow-100 text-yellow-700',
  off: 'bg-gray-100 text-gray-700',
  vacation: 'bg-red-100 text-red-700',
};

export default function TechnicianScheduleClient({ initialSchedule, isOwner }: { initialSchedule: StaffSchedule[], isOwner: boolean }) {
  const [schedule, setSchedule] = useState(initialSchedule);

  const updateStatus = async (date: string, status: StaffSchedule['status']) => {
    const { error } = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: 'me', date, status, notes: '' }),
    }).then(r => r.json());
    
    if (!error) {
      setSchedule(schedule.map(s => s.date === date ? { ...s, status } : s));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
      </div>

      <div className="space-y-3">
        {schedule.map((day) => (
          <div key={day.date} className="card p-4 flex justify-between items-center">
            <div>
              <div className="font-medium text-gray-900">
                {new Date(day.date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' })}
              </div>
              {day.notes && <div className="text-sm text-gray-500">{day.notes}</div>}
            </div>
            {isOwner ? (
              <select
                value={day.status}
                onChange={(e) => updateStatus(day.date, e.target.value as StaffSchedule['status'])}
                className="input w-auto"
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="off">Day Off</option>
                <option value="vacation">Vacation</option>
              </select>
            ) : (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[day.status]}`}>
                {day.status}
              </span>
            )}
          </div>
        ))}
      </div>

      {schedule.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-gray-500">No schedule entries for the next 30 days.</p>
        </div>
      )}

      <div className="card p-4 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Quick Stats</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {['available', 'busy', 'off', 'vacation'].map(status => (
            <div key={status}>
              <div className={`text-lg font-bold ${STATUS_COLORS[status].split(' ')[1]}`}>
                {schedule.filter(s => s.status === status).length}
              </div>
              <div className="text-xs text-gray-600 capitalize">{status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}