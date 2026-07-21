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
  category: 'maintenance' | 'job_site';
  reorder_level: number;
  created_at: string;
  updated_at: string;
}

export type MaterialCategory = 'maintenance' | 'job_site';

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

export type JobState = 'pending' | 'assigned' | 'completed' | 'to_be_invoiced' | 'invoiced';

export interface JobMaterial {
  id: string;
  job_card_id: string;
  material_id?: string;
  custom_name?: string;
  quantity: number;
  admin_unit_price: number;
  line_total: number;
  bought: boolean;
  claimed: boolean;
  bought_at?: string;
  claimed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface JobTender {
  id: string;
  job_card_id: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  uploaded_by?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  job_card_id: string;
  customer_id: string;
  invoice_number: string;
  amount_due: number;
  vat_amount: number;
  amount_paid: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  due_date?: string;
  issued_at: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  method: 'cash' | 'card' | 'eft' | 'other';
  recorded_by?: string;
  note?: string;
  created_at: string;
}

export interface JobSignature {
  id: string;
  job_card_id: string;
  customer_id?: string;
  signatory_name?: string;
  signature_data: string;
  created_at: string;
}

export interface WhatsappConfig {
  id: string;
  base_url: string;
  session_name: string;
  enabled: boolean;
  reminder_template: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsappMessage {
  id: string;
  invoice_id?: string;
  customer_id?: string;
  to_number: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  created_at: string;
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

export interface Service {
  id: string;
  name: string;
  description?: string;
  default_hourly_rate: number;
  default_materials?: { id: string; quantity: number }[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffSchedule {
  id: string;
  profile_id: string;
  date: string;
  status: 'available' | 'busy' | 'off' | 'vacation';
  notes?: string;
  created_at: string;
}

export interface Communication {
  id: string;
  customer_id?: string;
  job_id?: string;
  type: 'call' | 'email' | 'sms' | 'whatsapp';
  direction: 'inbound' | 'outbound';
  summary: string;
  timestamp: string;
  recorded_by?: string;
}

export interface Quote {
  id: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  description: string;
  status: 'pending' | 'reviewed' | 'quoted' | 'accepted' | 'rejected';
  estimated_price?: number;
  created_at: string;
}
