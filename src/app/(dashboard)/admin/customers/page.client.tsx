'use client';

import { useState } from 'react';
import type { Customer } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  initialCustomers: Customer[];
}

export default function CustomersClient({ initialCustomers }: Props) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) {
      setLoading(false);
      return;
    }
    const customerData = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address,
      notes: formData.notes || null,
    };
    const { error } = await supabase.from('customers').insert(customerData as unknown as { [key: string]: unknown });
    if (error) toast.error('Error: ' + error.message);
    else {
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', address: '', notes: '' });
      refresh();
    }
    setLoading(false);
  };

  const refresh = async () => {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const { data } = await supabase.from('customers').select('*').order('name');
    if (data) setCustomers(data);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete customer "${name}"? This cannot be undone. Jobs linked to this customer will block deletion.`)) return;
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      const msg = error.message.includes('violates foreign key') || error.message.includes('restricted')
        ? 'Cannot delete: customer has linked jobs. Delete or reassign those jobs first.'
        : error.message;
      toast.error(msg);
    } else {
      toast.success('Customer deleted');
      setCustomers(prev => prev.filter(c => c.id !== id));
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">+ Add Customer</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {customers.map((customer) => (
          <div key={customer.id} className="card p-4 group relative">
            <button
              onClick={() => handleDelete(customer.id, customer.name)}
              className="absolute top-2 right-2 opacity-60 group-hover:opacity-100 text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg text-xs font-medium"
              title="Delete customer (owner only)"
            >
              Delete
            </button>
            <h3 className="font-semibold text-gray-900 pr-12">{customer.name}</h3>
            {customer.email && <p className="text-sm text-gray-600">{customer.email}</p>}
            {customer.phone && <p className="text-sm text-gray-600">{customer.phone}</p>}
            <p className="text-sm text-gray-500 mt-2">{customer.address}</p>
            {customer.notes && (
              <p className="text-sm text-gray-400 mt-2 italic">{customer.notes}</p>
            )}
          </div>
        ))}

        {customers.length === 0 && (
          <div className="col-span-full card p-8 text-center text-gray-500">
            No customers yet. Add your first customer to get started.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Customer</h2>
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
                <label className="label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input"
                  rows={2}
                  required
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Customer'}
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
