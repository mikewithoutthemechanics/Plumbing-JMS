'use client';

import { useState, useEffect } from 'react';

interface Props {
  jobId: string;
  onAddMaterial: (jobId: string, materialId: string, quantity: number) => void;
  onAddCustom: (jobId: string, name: string, quantity: number) => void;
  loading: boolean;
}

export default function MaterialSelector({ jobId, onAddMaterial, onAddCustom, loading }: Props) {
  const [materials, setMaterials] = useState<{ id: string; name: string; unit: string }[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [customName, setCustomName] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    import('@/lib/supabase/client').then(({ supabase }) => {
      if (!supabase) return;
      supabase.from('materials').select('id, name, unit').eq('is_active', true).order('name')
        .then(({ data }) => data && setMaterials(data));
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedId(val);
    if (val) setCustomName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || qty < 1) return;
    if (selectedId) onAddMaterial(jobId, selectedId, qty);
    else if (customName) onAddCustom(jobId, customName, qty);
    setCustomName('');
    setQty(1);
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-4">
      <h3 className="font-semibold text-gray-900">Add Material</h3>
      <select value={selectedId} onChange={handleChange} className="input">
        <option value="">[ Select existing material ]</option>
        {materials.map((m) => (
          <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
        ))}
      </select>
      {!selectedId && (
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          className="input"
          placeholder="Or enter custom material name"
        />
      )}
      <input
        type="number"
        min="1"
        step="1"
        value={qty}
        onChange={(e) => setQty(parseInt(e.target.value) || 1)}
        className="input w-32"
      />
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Adding...' : 'Add Material'}
      </button>
    </form>
  );
}
