export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  admin_unit_price: number;
  quantity_on_hand: number;
  is_active: boolean;
  supplier_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  job_number: string;
  customer_id: string;
  assigned_to: string | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'invoiced';
  description: string;
  admin_hourly_rate: number;
  labour_cost: number;
  materials_cost: number;
  subtotal: number;
  vat_amount: number;
  grand_total: number;
  admin_notes: string | null;
  technician_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  invoiced_at: string | null;
  // Relational/join fields optionally populated when fetched with related data
  customer?: Pick<Customer, 'name' | 'email' | 'phone'> | null;
  assigned_to_profile?: Pick<User, 'id' | 'full_name' | 'email'> | null;
}

export interface User {
  id: string;
  email: string;
  role: 'owner' | 'technician' | 'accountant';
  full_name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}