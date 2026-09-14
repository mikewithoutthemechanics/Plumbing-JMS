'use client';

import { useState } from 'react';
import type { JobMaterialRow } from '@/types';
import toast from 'react-hot-toast';

interface MaterialsTableProps {
  materials: JobMaterialRow[];
  canManage: boolean;
  onToggleFlag: (material: JobMaterialRow, field: 'bought' | 'claimed') => void;
  onRemoveMaterial: (materialId: string) => void;
  onUpdate?: () => void;
}

export default function MaterialsTable({
  materials,
  canManage,
  onToggleFlag,
  onRemoveMaterial,
  onUpdate,
}: MaterialsTableProps) {
  const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const handlePriceSave = async (m: JobMaterialRow) => {
    const raw = editingPrice[m.id];
    if (raw === undefined) return;
    const price = Number(raw);
    if (Number.isNaN(price) || price < 0) {
      toast.error('Invalid price');
      return;
    }
    setSaving(m.id);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) { setSaving(null); return; }
    const line_total = price * Number(m.quantity || 0);
    const { error } = await supabase.from('job_materials').update({ admin_unit_price: price, line_total } as any).eq('id', m.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Price updated');
      setEditingPrice(prev => { const n = { ...prev }; delete n[m.id]; return n; });
      onUpdate?.();
    }
    setSaving(null);
  };

  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">Materials List {canManage ? <span className="text-xs font-normal text-gray-500">(tap price to edit - tech sees qty only)</span> : null}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase">
              <th className="px-3 py-2">Material</th>
              <th className="px-3 py-2">Qty</th>
              {canManage && <th className="px-3 py-2">Unit Price (ZAR)</th>}
              {canManage && <th className="px-3 py-2">Line Total</th>}
              <th className="px-3 py-2">Bought</th>
              <th className="px-3 py-2">Claimed</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {materials.map((m) => (
              <tr key={m.id} className="text-sm">
                <td className="px-3 py-2 font-medium text-gray-900">
                  {m.materials?.name || m.custom_name || 'Custom'}
                </td>
                <td className="px-3 py-2 text-gray-500">{m.quantity}</td>
                {canManage && (
                  <td className="px-3 py-2">
                    {editingPrice[m.id] !== undefined ? (
                      <div className="flex gap-1">
                        <input type="number" step="0.01" value={editingPrice[m.id]} onChange={e => setEditingPrice({ ...editingPrice, [m.id]: e.target.value })} className="input w-20 py-1 text-sm" autoFocus />
                        <button onClick={() => handlePriceSave(m)} disabled={saving === m.id} className="btn btn-primary text-xs px-2 py-1">{saving === m.id ? '...' : 'Save'}</button>
                        <button onClick={() => setEditingPrice(prev => { const n={...prev}; delete n[m.id]; return n; })} className="btn btn-secondary text-xs px-2 py-1">X</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingPrice({ ...editingPrice, [m.id]: String(m.admin_unit_price ?? 0) })} className="text-left">
                        <span className={Number(m.admin_unit_price) === 0 ? 'text-amber-600 font-medium' : 'text-gray-900'}>{Number(m.admin_unit_price || 0).toFixed(2)}</span>
                        {Number(m.admin_unit_price) === 0 && <span className="text-xs text-amber-600 ml-1">set price</span>}
                      </button>
                    )}
                  </td>
                )}
                {canManage && <td className="px-3 py-2 font-medium">R {(Number(m.admin_unit_price || 0) * Number(m.quantity || 0)).toFixed(2)}</td>}
                <td className="px-3 py-2">
                  <input type="checkbox" checked={!!m.bought} onChange={() => onToggleFlag(m, 'bought')} disabled={!canManage} className="h-4 w-4" />
                </td>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={!!m.claimed} onChange={() => onToggleFlag(m, 'claimed')} disabled={!canManage} className="h-4 w-4" />
                </td>
                <td className="px-3 py-2">
                  {canManage && (<button onClick={() => onRemoveMaterial(m.id)} className="text-red-600 hover:text-red-800 text-xs">Remove</button>)}
                </td>
              </tr>
            ))}
            {materials.length === 0 && (
              <tr>
                <td colSpan={canManage ? 7 : 5} className="px-3 py-3 text-sm text-gray-500">
                  No materials added yet. {canManage ? 'Tech will add qty, you set price here.' : 'Add qty via selector above.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
