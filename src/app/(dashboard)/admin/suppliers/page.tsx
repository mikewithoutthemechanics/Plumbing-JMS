import { createServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/types';

interface Props {
  initialSuppliers?: { id: string; name: string; email?: string; phone?: string; whatsapp?: string; is_active: boolean }[];
}

export default async function SuppliersPage({ initialSuppliers = [] }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id as string).single() as { data: Profile };

  if (profile?.role !== 'owner') return null;

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name, email, phone, whatsapp, address, is_active, created_at, updated_at')
    .order('name');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <a href="/admin/suppliers/new" className="btn btn-primary">+ Add Supplier</a>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(suppliers || initialSuppliers).map((supplier) => (
          <div key={supplier.id} className="card p-4">
            <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
            {supplier.email && <p className="text-sm text-gray-600">{supplier.email}</p>}
            {supplier.whatsapp && <p className="text-sm text-gray-600">📱 {supplier.whatsapp}</p>}
            {supplier.phone && !supplier.whatsapp && <p className="text-sm text-gray-600">📞 {supplier.phone}</p>}
            <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${supplier.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {supplier.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}