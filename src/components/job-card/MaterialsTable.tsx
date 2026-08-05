'use client';

import type { JobMaterialRow } from '@/types';

interface MaterialsTableProps {
  materials: JobMaterialRow[];
  canManage: boolean;
  onToggleFlag: (material: JobMaterialRow, field: 'bought' | 'claimed') => void;
  onRemoveMaterial: (materialId: string) => void;
}

export default function MaterialsTable({
  materials,
  canManage,
  onToggleFlag,
  onRemoveMaterial,
}: MaterialsTableProps) {
  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">Materials List</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase">
              <th className="px-3 py-2">Material</th>
              <th className="px-3 py-2">Qty</th>
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
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={m.bought}
                    onChange={() => onToggleFlag(m, 'bought')}
                    disabled={!canManage}
                    className="h-4 w-4"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={m.claimed}
                    onChange={() => onToggleFlag(m, 'claimed')}
                    disabled={!canManage}
                    className="h-4 w-4"
                  />
                </td>
                <td className="px-3 py-2">
                  {canManage && (
                    <button
                      onClick={() => onRemoveMaterial(m.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {materials.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-sm text-gray-500">
                  No materials added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {canManage && (
        // MaterialSelector is now a separate component and will be rendered elsewhere
        <></>
      )}
    </div>
  );
}