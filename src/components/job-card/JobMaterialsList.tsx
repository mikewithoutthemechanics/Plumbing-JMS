'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface JobMaterial {
  id: string;
  custom_name?: string;
  materials?: { name: string };
  quantity: number;
}

interface Props {
  materials: JobMaterial[];
  onUpdate: () => void;
}

export default function JobMaterialsList({ materials, onUpdate }: Props) {
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = async (materialId: string) => {
    setRemoving(materialId);
    const { error } = await supabase.from('job_materials').delete().eq('id', materialId);
    if (error) alert('Error: ' + error.message);
    else onUpdate();
    setRemoving(null);
  };

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Materials Added</h3>
      <div className="space-y-2">
        {materials.map((m) => (
          <div key={m.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <div>
              <span className="text-sm font-medium">{m.materials?.name || m.custom_name || 'Custom'}</span>
              <span className="text-sm text-gray-500 ml-2">x{m.quantity}</span>
            </div>
            <button
              onClick={() => handleRemove(m.id)}
              disabled={removing === m.id}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              {removing === m.id ? '...' : 'Remove'}
            </button>
          </div>
        ))}
        {materials.length === 0 && (
          <p className="text-sm text-gray-500">No materials added yet.</p>
        )}
      </div>
    </div>
  );
}
