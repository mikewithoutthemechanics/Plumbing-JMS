export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'technician' | 'accountant';
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  name: string;
  description?: string;
  unit: string;
  admin_unit_price: number;
  quantity_on_hand: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobCard {
  id: string;
  job_number: string;
  customer_id: string;
  assigned_to?: string;
  status: JobState;
  description: string;
  admin_hourly_rate: number;
  labour_cost: number;
  materials_cost: number;
  subtotal: number;
  vat_amount: number;
  grand_total: number;
  admin_notes?: string;
  technician_notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  invoiced_at?: string;
  customer?: { name: string };
  assigned_to_profile?: { full_name: string; email: string };
}

export type JobState = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'invoiced';

export interface JobMaterial {
  id: string;
  job_card_id: string;
  material_id?: string;
  custom_name?: string;
  quantity: number;
  admin_unit_price: number;
  line_total: number;
  created_at: string;
  updated_at: string;
}

export interface TimeLog {
  id: string;
  job_card_id: string;
  technician_id: string;
  clock_in: string;
  clock_out?: string;
  hours: number;
  is_paused: boolean;
  paused_at?: string;
  resumed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  changed_by: string;
  changed_at: string;
  ip_address?: string;
}

export interface BankingDetails {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch_code: string;
  swift_code?: string;
  reference_prefix: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyncQueueItem {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  timestamp: string;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
}
