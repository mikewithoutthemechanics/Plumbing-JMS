'use client';

import { useState } from 'react';

interface MaterialSummary {
  id: string;
  name: string;
  unit: string;
}

export default function TechnicianMaterialsClient({ activeJobs, materials }: { activeJobs: { id: string; job_number: string; description: string; status: string }[]; materials: MaterialSummary[] }) {
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentMaterials, setRecentMaterials] = useState<{ id: string; custom_name?: string; material_id?: string; materials?: { name: string }; quantity: number }[]>([]);

  const refreshRecent = async () => {
    if (!selectedJobId) return;
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const { data } = await supabase
      .from('job_materials')
      .select('*, materials(name)')
      .eq('job_card_id', selectedJobId)
      .order('created_at', { ascending: false });
    if (data) setRecentMaterials(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) {
      alert('Please select a job');
      return;
    }

    setLoading(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) {
      alert('Supabase not configured');
      setLoading(false);
      return;
    }
    if (selectedMaterialId) {
      const { error } = await supabase.from('job_materials').insert({
        job_card_id: selectedJobId,
        material_id: selectedMaterialId,
        quantity,
        admin_unit_price: 0,
        line_total: 0,
      } as never);
      if (error) alert('Error: ' + error.message);
      else refreshRecent();
    } else if (customName) {
      const { error } = await supabase.from('job_materials').insert({
        job_card_id: selectedJobId,
        custom_name: customName,
        quantity,
        admin_unit_price: 0,
        line_total: 0,
      } as never);
      if (error) alert('Error: ' + error.message);
      else {
        setCustomName('');
        refreshRecent();
      }
    }
    setSelectedMaterialId('');
    setQuantity(1);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Materials</h1>

      <div className="card p-4">
        <div className="mb-4">
          <label className="label">Select Job</label>
          <select
            value={selectedJobId}
            onChange={(e) => { setSelectedJobId(e.target.value); setRecentMaterials([]); }}
            className="input"
          >
            <option value="">Choose a job...</option>
            {activeJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.job_number} — {job.description}
              </option>
            ))}
          </select>
        </div>

        {selectedJobId && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Select Material (optional)</label>
              <select
                value={selectedMaterialId}
                onChange={(e) => { setSelectedMaterialId(e.target.value); if (e.target.value) setCustomName(''); }}
                className="input"
              >
                <option value="">Custom material...</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {!selectedMaterialId && (
              <div>
                <label className="label">Custom Material Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="input"
                  placeholder="Enter material name..."
                />
              </div>
            )}

            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="input w-32"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add to Job'}
            </button>
          </form>
        )}
      </div>

      {selectedJobId && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Materials Added to This Job</h3>
          <div className="space-y-2">
            {recentMaterials.map((m) => (
              <div key={m.id} className="p-2 bg-gray-50 rounded">
                {m.materials ? m.materials.name : m.custom_name || 'Unknown material'}
                <span className="text-sm text-gray-500 ml-2">x{m.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}