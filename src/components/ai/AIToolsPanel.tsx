'use client';

import { useState } from 'react';

type Task = 'triage' | 'reminder' | 'material' | 'timelog' | 'search' | 'profile';

export default function AIToolsPanel() {
  const [task, setTask] = useState<Task>('triage');
  const [input, setInput] = useState('');
  const [context, setContext] = useState('{}');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const { data: { session } } = await (await import('@/lib/supabase/client')).supabase.auth.getSession();
    const res = await fetch(`${supabaseUrl}/functions/v1/ai-assist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ task, input, context: JSON.parse(context) })
    });
    const json = await res.json();
    setResult(json);
    setLoading(false);
  };

  return (
    <div className="card p-4 space-y-4">
      <h2 className="font-semibold">AI Assist – Groq</h2>
      <div className="flex gap-2 flex-wrap">
        {(['triage','reminder','material','timelog','search','profile'] as Task[]).map(t=>(
          <button key={t} onClick={()=>setTask(t)} className={`btn ${task===t?'btn-primary':'btn-secondary'} text-xs`}>{t}</button>
        ))}
      </div>
      <textarea className="input w-full h-32" placeholder="Input text" value={input} onChange={e=>setInput(e.target.value)} />
      <textarea className="input w-full h-24" placeholder="Context JSON" value={context} onChange={e=>setContext(e.target.value)} />
      <button onClick={run} disabled={loading} className="btn btn-primary">Run</button>
      {result && (
        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
