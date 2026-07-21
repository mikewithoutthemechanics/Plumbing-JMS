'use client';

import { useState } from 'react';

interface Config {
  id?: string;
  base_url: string;
  session_name: string;
  enabled: boolean;
  reminder_template: string;
}

interface Props {
  initialConfig: Config | null;
}

export default function WhatsappClient({ initialConfig }: Props) {
  const [config, setConfig] = useState<Config>(
    initialConfig || {
      base_url: '',
      session_name: 'main',
      enabled: false,
      reminder_template:
        'Hi {{customer_name}}, your invoice {{invoice_number}} for {{amount_due}} is outstanding. Please make payment to avoid late fees.',
    }
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const res = await fetch('/api/whatsapp', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      const json = await res.json();
      setConfig(json.config);
      setMsg('Settings saved.');
    } else {
      const err = await res.json();
      setMsg('Error: ' + err.error);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">WhatsApp Automation (OpenWA)</h1>
      <p className="text-sm text-gray-500">
        Connect your OpenWA instance to automatically remind debtors about outstanding invoices.
      </p>

      <form onSubmit={save} className="card p-6 space-y-4 max-w-2xl">
        <div>
          <label className="label">OpenWA Base URL</label>
          <input
            type="text"
            value={config.base_url}
            onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
            className="input"
            placeholder="https://your-openwa-server:8080"
            required
          />
        </div>
        <div>
          <label className="label">Session Name</label>
          <input
            type="text"
            value={config.session_name}
            onChange={(e) => setConfig({ ...config, session_name: e.target.value })}
            className="input"
            placeholder="main"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="h-4 w-4"
          />
          <label className="text-sm text-gray-700">Enable automation</label>
        </div>
        <div>
          <label className="label">Reminder Template</label>
          <textarea
            value={config.reminder_template}
            onChange={(e) => setConfig({ ...config, reminder_template: e.target.value })}
            className="input"
            rows={4}
          />
          <p className="text-xs text-gray-400 mt-1">Available variables: {'{{customer_name}}'}, {'{{invoice_number}}'}, {'{{amount_due}}'}</p>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {msg && <p className="text-sm text-green-600">{msg}</p>}
      </form>
    </div>
  );
}
