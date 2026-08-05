import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { JobCard, AuditLog, Material } from '@/types';
import AdminOverviewClient from './page.client';

export const fetchCache = 'force-no-store';

export default async function AdminOverviewPage() {
  const cookieStore = await cookies();
  const devMode = cookieStore.get('dev_admin')?.value === '1';

  if (devMode) {
    return (
      <AdminOverviewClient
        jobs={[
          {
            id: 'mock-job-1', job_number: 'JOB-MOCK-001', customer_id: 'mock-cust-1', assigned_to: 'dev-admin-001',
            status: 'completed', description: 'Burst pipe in kitchen', admin_hourly_rate: 450, labour_cost: 1350,
            materials_cost: 320, subtotal: 1670, vat_amount: 250.5, grand_total: 1920.5, admin_notes: 'Morning visit',
            technician_notes: '', created_by: 'dev-admin-001', created_at: '2025-01-01T08:00:00Z', updated_at: '2025-01-01T08:00:00Z',
            customer: { name: 'John Smith' }, assigned_to_profile: { full_name: 'Mike the Plumber', email: 'mike@example.com' },
          },
          {
            id: 'mock-job-2', job_number: 'JOB-MOCK-002', customer_id: 'mock-cust-2', assigned_to: 'dev-admin-001',
            status: 'to_be_invoiced', description: 'Leaking toilet cistern', admin_hourly_rate: 450, labour_cost: 675,
            materials_cost: 180, subtotal: 855, vat_amount: 128.25, grand_total: 983.25, admin_notes: 'Follow up in 2 weeks',
            technician_notes: '', created_by: 'dev-admin-001', created_at: '2025-01-02T08:00:00Z', updated_at: '2025-01-02T08:00:00Z',
            customer: { name: 'Sarah Johnson' }, assigned_to_profile: { full_name: 'Mike the Plumber', email: 'mike@example.com' },
          },
          {
            id: 'mock-job-3', job_number: 'JOB-MOCK-003', customer_id: 'mock-cust-3', assigned_to: 'dev-admin-001',
            status: 'pending', description: 'New geyser installation', admin_hourly_rate: 450, labour_cost: 0,
            materials_cost: 0, subtotal: 0, vat_amount: 0, grand_total: 0, admin_notes: 'Awaiting parts',
            technician_notes: '', created_by: 'dev-admin-001', created_at: '2025-01-03T08:00:00Z', updated_at: '2025-01-03T08:00:00Z',
            customer: { name: 'Mike van der Merwe' }, assigned_to_profile: { full_name: 'Dave the Apprentice', email: 'dave@example.com' },
          },
        ]}
        recentAudits={[
          { id: 'mock-audit-1', table_name: 'job_cards', record_id: 'mock-job-1', action: 'INSERT', changed_at: '2025-01-01T08:00:00Z', changed_by: 'dev-admin-001' },
          { id: 'mock-audit-2', table_name: 'job_cards', record_id: 'mock-job-2', action: 'UPDATE', changed_at: '2025-01-01T08:00:00Z', changed_by: 'dev-admin-001' },
        ]}
        lowStock={[
          { id: 'mock-mat-1', name: 'PVC Pipe 110mm', unit: 'meter', quantity_on_hand: 2, admin_unit_price: 45, category: 'maintenance', reorder_level: 10, is_active: true, created_at: '2025-01-01T08:00:00Z', updated_at: '2025-01-01T08:00:00Z' },
        ]}
      />
    );
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return null;

  const [{ data: jobs }, { data: recentAudits }, { data: lowStock }] = await Promise.all([
    supabase.from('job_cards').select('status, grand_total, created_at').order('created_at', { ascending: false }).limit(10),
    supabase.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(10),
    supabase.from('materials').select('id, name, unit, quantity_on_hand, admin_unit_price, category, reorder_level, is_active, created_at, updated_at').lte('quantity_on_hand', 5).eq('is_active', true),
  ]);

  return (
    <AdminOverviewClient
      jobs={(jobs || []) as JobCard[]}
      recentAudits={recentAudits || []}
      lowStock={lowStock || []}
    />
  );
}
