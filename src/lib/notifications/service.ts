import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { sendJobAssignedEmail, sendEnquiryEmail } from './email';

export async function processJobAssignedNotifications(): Promise<{ processed: number; failed: number }> {
  const supabase = getSupabaseAdminClient();

  const { data: notifications, error } = await supabase
    .from('job_assigned_notifications')
    .select('*')
    .eq('status', 'pending')
    .limit(50);

  if (error || !notifications?.length) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const notif of notifications) {
    try {
      const { data: tech } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', notif.technician_id)
        .single();

      if (!tech?.email) {
        throw new Error('Technician has no email');
      }

      await sendJobAssignedEmail({
        to: tech.email,
        technicianName: tech.full_name || 'Technician',
        customerName: notif.customer_name,
        jobNumber: notif.job_number,
        jobUrl: `${APP_URL}/technician/jobs/${notif.job_card_id}`,
      });

      await supabase
        .from('job_assigned_notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notif.id);
      processed++;
    } catch (e) {
      await supabase
        .from('job_assigned_notifications')
        .update({ status: 'failed', error_message: String(e) })
        .eq('id', notif.id);
      failed++;
    }
  }

  return { processed, failed };
}

export async function processQuoteEnquiryNotifications(): Promise<{ processed: number; failed: number }> {
  const supabase = getSupabaseAdminClient();

  const { data: notifications, error } = await supabase
    .from('quote_enquiry_notifications')
    .select('*')
    .eq('status', 'pending')
    .limit(50);

  if (error || !notifications?.length) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const notif of notifications) {
    try {
      await sendEnquiryEmail({
        customerName: notif.customer_name,
        customerEmail: notif.customer_email || '',
        customerPhone: notif.customer_phone || '',
        description: notif.description || '',
        quoteUrl: `${APP_URL}/admin/quotes/${notif.quote_id}`,
      });

      await supabase
        .from('quote_enquiry_notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notif.id);
      processed++;
    } catch (e) {
      await supabase
        .from('quote_enquiry_notifications')
        .update({ status: 'failed', error_message: String(e) })
        .eq('id', notif.id);
      failed++;
    }
  }

  return { processed, failed };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';