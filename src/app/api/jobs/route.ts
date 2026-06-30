import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/utils/audit';
import { canAdvanceState, canAccessJob, canSeePricing } from '@/lib/utils/permissions';

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');
  const technicianId = searchParams.get('technicianId');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'technician';

  let query = supabase
    .from('job_cards')
    .select(`
      *,
      customer:customers(*),
      assigned_to_profile:profiles!job_cards_assigned_to_fkey(id, full_name, email)
    `)
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  if (userRole === 'technician' && technicianId) {
    query = query.eq('assigned_to', technicianId);
  }

  const { data: jobs, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filteredJobs = jobs?.filter((job) => canAccessJob(userRole, job.status, job.assigned_to === user.id)) || [];

  const sanitized = filteredJobs.map((job: Record<string, unknown>) => {
    if (!canSeePricing(userRole)) {
      return {
        ...job,
        admin_hourly_rate: null,
        labour_cost: null,
        materials_cost: null,
        subtotal: null,
        vat_amount: null,
        grand_total: null,
      };
    }
    return job;
  });

  return NextResponse.json({ jobs: sanitized });
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { customer_id, description, admin_hourly_rate, admin_notes, assigned_to } = body;
    if (!customer_id || !description || admin_hourly_rate == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const jobNumber = `JOB-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    let finalAssignedTo = assigned_to;
    if (!finalAssignedTo) {
      const { data: technicians } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'technician');

      if (technicians && technicians.length > 0) {
        const { data: activeJobCounts } = await supabase
          .from('job_cards')
          .select('assigned_to')
          .in('status', ['assigned', 'in_progress']);

        const counts: Record<string, number> = {};
        (activeJobCounts || []).forEach(j => { if (j.assigned_to) counts[j.assigned_to] = (counts[j.assigned_to] || 0) + 1; });

        const sorted = [...technicians].sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0));
        finalAssignedTo = sorted[0].id;
      }
    }

    const { data: job, error } = await supabase
      .from('job_cards')
      .insert({
        job_number: jobNumber,
        customer_id,
        description,
        admin_hourly_rate,
        admin_notes,
        assigned_to: finalAssignedTo,
        status: finalAssignedTo ? 'assigned' : 'pending',
        created_by: user.id,
        labour_cost: 0,
        materials_cost: 0,
        subtotal: 0,
        vat_amount: 0,
        grand_total: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[Jobs API] Create failed:', error);
      return NextResponse.json({ error: 'Failed to create job card' }, { status: 500 });
    }

    await logAudit({
      tableName: 'job_cards',
      recordId: job.id,
      action: 'INSERT',
      newValues: job,
      changedBy: user.id,
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
  if (!profile || profile.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { job_id, status, description, admin_hourly_rate, admin_notes, assigned_to } = body;
    if (!job_id) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 });

    const { data: existingJob } = await supabase.from('job_cards').select('*').eq('id', job_id).single();
    if (!existingJob) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    if (status && status !== existingJob.status) {
      if (!canAdvanceState(profile.role, existingJob.status, status)) {
        return NextResponse.json({ error: 'Invalid state transition' }, { status: 400 });
      }
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (description !== undefined) updates.description = description;
    if (admin_hourly_rate !== undefined) updates.admin_hourly_rate = admin_hourly_rate;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (status === 'completed' && existingJob.status !== 'completed') updates.completed_at = new Date().toISOString();
    if (status === 'invoiced' && existingJob.status !== 'invoiced') updates.invoiced_at = new Date().toISOString();

    const { data: updatedJob, error } = await supabase
      .from('job_cards')
      .update(updates)
      .eq('id', job_id)
      .select()
      .single();

    if (error) {
      console.error('[Jobs API] Update failed:', error);
      return NextResponse.json({ error: 'Failed to update job card' }, { status: 500 });
    }

    if (status === 'invoiced' && existingJob.status !== 'invoiced') {
      const { data: jobMaterials } = await supabase
        .from('job_materials')
        .select('material_id, quantity')
        .eq('job_card_id', job_id);

      if (jobMaterials && jobMaterials.length > 0) {
        for (const jm of jobMaterials) {
          if (jm.material_id) {
            const { data: material } = await supabase
              .from('materials')
              .select('quantity_on_hand')
              .eq('id', jm.material_id)
              .single();

            if (material) {
              const newQty = Math.max(0, (material.quantity_on_hand || 0) - jm.quantity);
              await supabase
                .from('materials')
                .update({ quantity_on_hand: newQty })
                .eq('id', jm.material_id);

              if (newQty <= 5) {
                await logAudit({
                  tableName: 'materials',
                  recordId: jm.material_id,
                  action: 'UPDATE',
                  oldValues: { quantity_on_hand: material.quantity_on_hand },
                  newValues: { quantity_on_hand: newQty, alert: newQty === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK' },
                  changedBy: user.id,
                });
              }
            }
          }
        }
      }
    }

    await logAudit({
      tableName: 'job_cards',
      recordId: job_id,
      action: 'UPDATE',
      oldValues: existingJob,
      newValues: updatedJob,
      changedBy: user.id,
    });

    return NextResponse.json({ job: updatedJob });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('id');
  if (!jobId) return NextResponse.json({ error: 'Missing job id' }, { status: 400 });

  const { data: existingJob } = await supabase.from('job_cards').select('*').eq('id', jobId).single();
  if (!existingJob) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (existingJob.status !== 'pending') return NextResponse.json({ error: 'Can only delete pending jobs' }, { status: 400 });

  const { error } = await supabase.from('job_cards').delete().eq('id', jobId);
  if (error) return NextResponse.json({ error: 'Failed to delete job card' }, { status: 500 });

  await logAudit({
    tableName: 'job_cards',
    recordId: jobId,
    action: 'DELETE',
    oldValues: existingJob,
    changedBy: user.id,
  });

  return NextResponse.json({ success: true });
}
