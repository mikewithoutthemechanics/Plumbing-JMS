import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/utils/audit';
import { validateJobInput } from '@/lib/validation';
import { canAdvanceState, canAccessJob, canSeePricing } from '@/lib/utils/permissions';
import { calculateJobTotals } from '@/lib/utils/calculations';
import { processJobAssignedNotifications } from '@/lib/notifications/service';

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

    // Validate numeric and other required fields via validator
    const validationErrors = validateJobInput(body);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join(', ') }, { status: 400 });
    }

    const jobNumber = `JOB-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

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

    if (finalAssignedTo) {
      await processJobAssignedNotifications();
    }

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error('[Jobs API] Error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  let supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  try {
    supabase = await getSupabaseServerClient();
  } catch (e) {
    console.error('[Jobs API] Supabase env missing:', e);
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Frontend sends Authorization: Bearer <token> — honour it, fall back to cookies.
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const { data: { user } } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
  if (!profile || profile.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    let { job_id, status, description, admin_hourly_rate, admin_notes, assigned_to } = body;
    if (!job_id) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 });

    // Normalise form junk that Postgres rejects: "" is not a UUID or numeric.
    if (assigned_to === '') assigned_to = null;
    if (admin_hourly_rate === '') admin_hourly_rate = undefined;
    if (typeof admin_hourly_rate === 'string' && admin_hourly_rate !== undefined) {
      const n = Number(admin_hourly_rate);
      if (Number.isNaN(n)) return NextResponse.json({ error: 'admin_hourly_rate must be a number' }, { status: 400 });
      admin_hourly_rate = n;
    }

    const { data: existingJob } = await supabase.from('job_cards').select('*').eq('id', job_id).single();
    if (!existingJob) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Validate state transition
    if (status && status !== existingJob.status) {
      if (!canAdvanceState(profile.role, existingJob.status, status, existingJob.assigned_to === user.id)) {
        return NextResponse.json({ error: 'Invalid state transition' }, { status: 400 });
      }

      // Block transition to 'invoiced' when any job material exceeds stock on hand
      if (status === 'invoiced' && existingJob.status !== 'invoiced') {
        const { data: stockCheck } = await supabase
          .from('job_materials')
          .select('material_id, quantity')
          .eq('job_card_id', job_id);

        if (stockCheck && stockCheck.length > 0) {
          const materialIds = stockCheck.filter(jm => jm.material_id).map(jm => jm.material_id!);
          const { data: materials } = await supabase
            .from('materials')
            .select('id, quantity_on_hand')
            .in('id', materialIds);
          const stockMap = new Map((materials || []).map(m => [m.id, m.quantity_on_hand ?? 0]));

          const shortfalls: { material_id: string; required: number; on_hand: number }[] = [];
          for (const jm of stockCheck) {
            if (!jm.material_id) continue;
            const onHand = stockMap.get(jm.material_id) ?? 0;
            if (onHand < jm.quantity) {
              shortfalls.push({ material_id: jm.material_id, required: jm.quantity, on_hand: onHand });
            }
          }
          if (shortfalls.length > 0) {
            return NextResponse.json({ error: 'Cannot invoice: insufficient stock.', shortfalls }, { status: 409 });
          }
        }
      }
    }

    // Build update payload — recalculate totals when state is changing
    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (description !== undefined) updates.description = description;
    if (admin_hourly_rate !== undefined) updates.admin_hourly_rate = admin_hourly_rate;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (status === 'completed' && existingJob.status !== 'completed') updates.completed_at = new Date().toISOString();
    if (status === 'invoiced' && existingJob.status !== 'invoiced') updates.invoiced_at = new Date().toISOString();

    if (status && status !== existingJob.status) {
      const { data: jmRows } = await supabase
        .from('job_materials')
        .select('admin_unit_price, quantity')
        .eq('job_card_id', job_id);
      const { data: tlRows } = await supabase
        .from('time_logs')
        .select('hours')
        .eq('job_card_id', job_id);

      const materials = (jmRows || []).map(m => ({ unitPrice: m.admin_unit_price || 0, quantity: m.quantity || 0 }));
      const totalHours = (tlRows || []).reduce((sum, t) => sum + (t.hours || 0), 0);
      const rate = updates.admin_hourly_rate as number | undefined;
      const totals = calculateJobTotals(rate ?? (existingJob.admin_hourly_rate || 0), totalHours, materials);

      updates.labour_cost = totals.labour;
      updates.materials_cost = totals.materialsCost;
      updates.subtotal = totals.subtotal;
      updates.vat_amount = totals.vat;
      updates.grand_total = totals.grandTotal;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No changes supplied' }, { status: 400 });
    }

    const { data: updatedJob, error } = await supabase
      .from('job_cards')
      .update(updates)
      .eq('id', job_id)
      .select()
      .single();

    if (error) {
      console.error('[Jobs API] Update failed:', JSON.stringify({
        job_id,
        updates,
        code: (error as { code?: string }).code,
        message: error.message,
        hint: (error as { hint?: string }).hint,
      }));
      return NextResponse.json({ error: error.message || 'Failed to update job card', details: error }, { status: 500 });
    }

    // Deduct materials from inventory when invoicing (atomic decrement)
    if (status === 'invoiced' && existingJob.status !== 'invoiced') {
      const { data: jobMaterials } = await supabase
        .from('job_materials')
        .select('material_id, quantity')
        .eq('job_card_id', job_id);

      if (jobMaterials && jobMaterials.length > 0) {
        const materialIds = jobMaterials.filter(jm => jm.material_id).map(jm => jm.material_id!);
        if (materialIds.length > 0) {
          // Fetch current stock for audit logging
          const { data: currentStock } = await supabase
            .from('materials')
            .select('id, quantity_on_hand')
            .in('id', materialIds);
          const stockBefore = new Map((currentStock || []).map(m => [m.id, m.quantity_on_hand ?? 0]));

          // Atomic decrement: read current stock, compute new qty, write back
          for (const jm of jobMaterials) {
            if (!jm.material_id) continue;
            const prev = stockBefore.get(jm.material_id) ?? 0;
            const newQty = Math.max(0, prev - jm.quantity);
            await supabase
              .from('materials')
              .update({ quantity_on_hand: newQty } as Record<string, unknown>)
              .eq('id', jm.material_id);

            if (newQty <= 5) {
              await logAudit({
                tableName: 'materials',
                recordId: jm.material_id,
                action: 'UPDATE',
                oldValues: { quantity_on_hand: prev },
                newValues: { quantity_on_hand: newQty, alert: newQty === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK' },
                changedBy: user.id,
              });
            }
          }
        }
      }
    }

    if (assigned_to !== undefined && assigned_to !== existingJob.assigned_to) {
      await processJobAssignedNotifications();
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
  } catch (error) {
    console.error('[Jobs API] Error:', error);
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
