'use client';

import { useState } from 'react';
import type { Material } from '@/types';

interface Props {
  initialMaterials: Material[];
}

export default function MaterialsClient({ initialMaterials }: Props) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'each',
    admin_unit_price: '',
    quantity_on_hand: '',
    is_active: true,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) {
      setLoading(false);
      return;
    }
    const materialData = {
      ...formData,
      admin_unit_price: parseFloat(formData.admin_unit_price),
      quantity_on_hand: parseFloat(formData.quantity_on_hand) || 0,
      description: formData.description || null,
    };
    const { error } = await supabase.from('materials').insert(materialData as never);
    if (error) alert('Error: ' + error.message);
    else {
      setShowModal(false);
      setFormData({ name: '', description: '', unit: 'each', admin_unit_price: '', quantity_on_hand: '', is_active: true });
      refresh();
    }
    setLoading(false);
  };

  const handleUpdateQty = async (material: Material) => {
    setLoading(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { error } = await supabase.from('materials').update({ quantity_on_hand: parseFloat(editQty) } as never).eq('id', material.id);
    if (error) alert('Error: ' + error.message);
    else {
      setMaterials(materials.map(m => m.id === material.id ? { ...m, quantity_on_hand: parseFloat(editQty) } : m));
      setEditingId(null);
    }
    setLoading(false);
  };

  const refresh = async () => {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const { data } = await supabase.from('materials').select('*').eq('is_active', true).order('name');
    if (data) setMaterials(data as Material[]);
  };

  const lowStockItems = materials.filter(m => m.quantity_on_hand <= 5);
  const outOfStockItems = materials.filter(m => m.quantity_on_hand === 0);

  return (
    <div className="space-y-6">
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="space-y-2">
          {outOfStockItems.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-sm font-semibold text-red-800">Out of Stock — Immediate Reorder Required</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {outOfStockItems.map(m => (
                  <span key={m.id} className="px-2 py-1 bg-white rounded text-xs text-red-700 border border-red-200">{m.name} ({m.unit})</span>
                ))}
              </div>
            </div>
          )}
          {lowStockItems.filter(m => m.quantity_on_hand > 0).length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-sm font-semibold text-yellow-800">Low Stock — Consider Reordering Soon</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {lowStockItems.filter(m => m.quantity_on_hand > 0).map(m => (
                  <span key={m.id} className="px-2 py-1 bg-white rounded text-xs text-yellow-700 border border-yellow-200">{m.name}: {m.quantity_on_hand} {m.unit} left</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Materials & Inventory</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">+ Add Material</button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price (ZAR)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty on Hand</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {materials.map((material) => (
              <tr key={material.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{material.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{material.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(material.admin_unit_price)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {editingId === material.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        className="input w-24"
                        autoFocus
                      />
                      <button onClick={() => handleUpdateQty(material)} disabled={loading} className="btn btn-primary text-xs">Save</button>
                      <button onClick={() => setEditingId(null)} className="btn btn-secondary text-xs">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(material.id); setEditQty(String(material.quantity_on_hand)); }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {material.quantity_on_hand} {material.unit}
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${material.quantity_on_hand > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {material.quantity_on_hand > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {materials.length === 0 && (
          <div className="p-8 text-center text-gray-500">No materials found. Add your first material.</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Material</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
              <div>
                <label className="label">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="input"
                >
                  <option value="each">Each</option>
                  <option value="box">Box</option>
                  <option value="meter">Meter</option>
                  <option value="liter">Liter</option>
                  <option value="kg">Kilogram</option>
                  <option value="pack">Pack</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Price per unit (ZAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.admin_unit_price}
                    onChange={(e) => setFormData({ ...formData, admin_unit_price: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Initial qty on hand</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity_on_hand}
                    onChange={(e) => setFormData({ ...formData, quantity_on_hand: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Material'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
