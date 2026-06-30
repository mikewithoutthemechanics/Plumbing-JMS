import type { JobCard, Customer, Material, AuditLog } from '@/types';

export function isDevMode(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') || '';
  return cookieHeader.includes('dev_admin=1');
}

export function getMockJobs(): JobCard[] {
  return [
    {
      id: 'mock-job-1',
      job_number: 'JOB-MOCK-001',
      customer_id: 'mock-cust-1',
      assigned_to: 'dev-admin-001',
      status: 'in_progress',
      description: 'Burst pipe in kitchen',
      admin_hourly_rate: 450,
      labour_cost: 1350,
      materials_cost: 320,
      subtotal: 1670,
      vat_amount: 250.5,
      grand_total: 1920.5,
      admin_notes: 'Customer asked for morning visit.',
      technician_notes: '',
      created_by: 'dev-admin-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customer: { name: 'John Smith' },
      assigned_to_profile: { full_name: 'Mike the Plumber', email: 'mike@example.com' },
    },
    {
      id: 'mock-job-2',
      job_number: 'JOB-MOCK-002',
      customer_id: 'mock-cust-2',
      assigned_to: 'dev-admin-001',
      status: 'completed',
      description: 'Leaking toilet cistern',
      admin_hourly_rate: 450,
      labour_cost: 675,
      materials_cost: 180,
      subtotal: 855,
      vat_amount: 128.25,
      grand_total: 983.25,
      admin_notes: 'Follow up in 2 weeks.',
      technician_notes: '',
      created_by: 'dev-admin-001',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
      customer: { name: 'Sarah Johnson' },
      assigned_to_profile: { full_name: 'Mike the Plumber', email: 'mike@example.com' },
    },
    {
      id: 'mock-job-3',
      job_number: 'JOB-MOCK-003',
      customer_id: 'mock-cust-3',
      assigned_to: 'dev-admin-001',
      status: 'pending',
      description: 'New geyser installation',
      admin_hourly_rate: 450,
      labour_cost: 0,
      materials_cost: 0,
      subtotal: 0,
      vat_amount: 0,
      grand_total: 0,
      admin_notes: 'Awaiting parts delivery.',
      technician_notes: '',
      created_by: 'dev-admin-001',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date(Date.now() - 172800000).toISOString(),
      customer: { name: 'Mike van der Merwe' },
      assigned_to_profile: { full_name: 'Dave the Apprentice', email: 'dave@example.com' },
    },
  ];
}

export function getMockCustomers(): Customer[] {
  return [
    { id: 'mock-cust-1', name: 'John Smith', email: 'john@example.com', phone: '082-555-1234', address: '123 Main St, Cape Town', notes: 'Prefers morning appointments', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'mock-cust-2', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '083-555-5678', address: '456 Oak Ave, Johannesburg', notes: 'Has water meter in back garden', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'mock-cust-3', name: 'Mike van der Merwe', email: 'mike@example.com', phone: '084-555-9012', address: '789 Pine Rd, Durban', notes: 'Commercial property', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];
}

export function getMockMaterials(): Material[] {
  return [
    { id: 'mock-mat-1', name: 'PVC Pipe 110mm', description: 'Standard drainage pipe', unit: 'meter', admin_unit_price: 45, quantity_on_hand: 50, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'mock-mat-2', name: 'Copper Pipe 15mm', description: 'Hot water pipe', unit: 'meter', admin_unit_price: 65, quantity_on_hand: 30, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'mock-mat-3', name: 'Silicone Sealant', description: 'Clear bathroom sealant', unit: 'tube', admin_unit_price: 28, quantity_on_hand: 100, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];
}

export function getMockAudits(): AuditLog[] {
  return [
    { id: 'mock-audit-1', table_name: 'job_cards', record_id: 'mock-job-1', action: 'INSERT', changed_at: new Date().toISOString(), changed_by: 'dev-admin-001' },
    { id: 'mock-audit-2', table_name: 'job_cards', record_id: 'mock-job-2', action: 'UPDATE', changed_at: new Date().toISOString(), changed_by: 'dev-admin-001' },
  ];
}
