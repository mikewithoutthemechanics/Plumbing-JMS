import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/utils/audit';
import { canExport } from '@/lib/utils/permissions';
import { generateExcelExport } from '@/lib/utils/export';
import type { JobExportRow } from '@/lib/utils/export';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const role = profile?.role || 'technician';
  if (!canExport(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { data: jobs, error } = await supabase
      .from('job_cards')
      .select(`
        *,
        customer:customers(name),
        assigned_to_profile:profiles!job_cards_assigned_to_fkey(full_name),
        job_materials(*)
      `)
      .eq('status', 'invoiced')
      .order('invoiced_at', { ascending: false });

    if (error) throw error;

    const { data: banking } = await supabase
      .from('banking_details')
      .select('*')
      .eq('is_active', true)
      .single();

    const exportRows: JobExportRow[] = (jobs || []).map((job) => ({
      JobNumber: job.job_number,
      Date: job.invoiced_at ? job.invoiced_at.split('T')[0] : '',
      Customer: job.customer?.name || '',
      Technician: job.assigned_to_profile?.full_name || '',
      Status: job.status,
      Description: job.description,
      LabourHours: 0,
      LabourRate: job.admin_hourly_rate,
      LabourCost: job.labour_cost,
      MaterialsCost: job.materials_cost,
      Subtotal: job.subtotal,
      VAT: job.vat_amount,
      GrandTotal: job.grand_total,
      AdminNotes: job.admin_notes || '',
    }));

    const buffer = generateExcelExport(
      exportRows,
      {
        bankName: banking?.bank_name || '',
        accountName: banking?.account_name || '',
        accountNumber: banking?.account_number || '',
        branchCode: banking?.branch_code || '',
        referencePrefix: banking?.reference_prefix || 'PLB',
      }
    );

    await logAudit({
      tableName: 'job_cards',
      recordId: 'batch',
      action: 'UPDATE',
      newValues: { export: true, count: exportRows.length },
      changedBy: user.id,
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="job-cards-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('[Export] Failed:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { jobIds } = body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json({ error: 'Missing jobIds' }, { status: 400 });
    }

    const { data: jobs, error: jobsError } = await supabase
      .from('job_cards')
      .select(`
        *,
        customer:customers(name),
        assigned_to_profile:profiles!job_cards_assigned_to_fkey(full_name)
      `)
      .in('id', jobIds);

    if (jobsError) throw jobsError;

    const { data: banking } = await supabase
      .from('banking_details')
      .select('*')
      .eq('is_active', true)
      .single();

    const exportRows: JobExportRow[] = (jobs || []).map((job) => ({
      JobNumber: job.job_number,
      Date: job.invoiced_at ? job.invoiced_at.split('T')[0] : '',
      Customer: job.customer?.name || '',
      Technician: job.assigned_to_profile?.full_name || '',
      Status: job.status,
      Description: job.description,
      LabourHours: 0,
      LabourRate: job.admin_hourly_rate,
      LabourCost: job.labour_cost,
      MaterialsCost: job.materials_cost,
      Subtotal: job.subtotal,
      VAT: job.vat_amount,
      GrandTotal: job.grand_total,
      AdminNotes: job.admin_notes || '',
    }));

    const buffer = generateExcelExport(
      exportRows,
      {
        bankName: banking?.bank_name || '',
        accountName: banking?.account_name || '',
        accountNumber: banking?.account_number || '',
        branchCode: banking?.branch_code || '',
        referencePrefix: banking?.reference_prefix || 'PLB',
      }
    );

    await logAudit({
      tableName: 'job_cards',
      recordId: jobIds.join(','),
      action: 'UPDATE',
      newValues: { export: true, count: jobIds.length },
      changedBy: user.id,
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="job-cards-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('[Export] Failed:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}