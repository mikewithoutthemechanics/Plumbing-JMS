import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { sendJobAssignedEmail, sendEnquiryEmail } from './email';
import { sendPushToMultiple } from './push';

interface ProcessResult {
  processed: number;
  failed: number;
  errors?: string[];
}

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_APP_URL environment variable is required');
  }
  return url;
}

export async function processJobAssignedNotifications(): Promise<ProcessResult> {
  const supabase = getSupabaseAdminClient();
  const errors: string[] = [];

  let appUrl: string;
  try {
    appUrl = getAppUrl();
  } catch (e) {
    return { processed: 0, failed: 0, errors: ['NEXT_PUBLIC_APP_URL is not configured'] };
  }

  const { data: notifications, error } = await supabase
    .from('job_assigned_notifications')
    .select('*')
    .eq('status', 'pending')
    .limit(50);

  if (error) {
    errors.push(`Failed to fetch pending notifications: ${error.message}`);
    return { processed: 0, failed: 0, errors };
  }

  if (!notifications?.length) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const notif of notifications) {
    try {
      const { data: tech, error: techError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', notif.technician_id)
        .single();

      if (techError || !tech?.email) {
        throw new Error(techError?.message || 'Technician has no email');
      }

      await sendJobAssignedEmail({
        to: tech.email,
        technicianName: tech.full_name || 'Technician',
        customerName: notif.customer_name,
        jobNumber: notif.job_number,
        jobUrl: `${appUrl}/technician/jobs/${notif.job_card_id}`,
      });

      // Send push notification
      try {
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', notif.technician_id);

        if (subscriptions?.length) {
          await sendPushToMultiple(
            subscriptions.map(s => ({
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            })),
            {
              title: 'New Job Assigned',
              body: `${notif.customer_name} - ${notif.job_number}`,
              icon: '/icon-192.png',
              badge: '/badge-72.png',
              data: {
                url: `${appUrl}/technician/jobs/${notif.job_card_id}`,
                tag: `job-${notif.job_card_id}`,
              },
              requireInteraction: true,
              vibrate: [200, 100, 200],
            }
          );
        }
      } catch (pushError) {
        console.error('[Push] Failed to send job assigned push:', pushError);
        // Don't fail the whole notification if push fails
      }

      await supabase
        .from('job_assigned_notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notif.id);
      processed++;
    } catch (e) {
      const errorMsg = `Job ${notif.job_number}: ${String(e)}`;
      errors.push(errorMsg);
      await supabase
        .from('job_assigned_notifications')
        .update({ status: 'failed', error_message: String(e) })
        .eq('id', notif.id);
      failed++;
    }
  }

  return { processed, failed, errors: errors.length ? errors : undefined };
}

export async function processQuoteEnquiryNotifications(): Promise<ProcessResult> {
  const supabase = getSupabaseAdminClient();
  const errors: string[] = [];

  let appUrl: string;
  try {
    appUrl = getAppUrl();
  } catch (e) {
    return { processed: 0, failed: 0, errors: ['NEXT_PUBLIC_APP_URL is not configured'] };
  }

  const { data: notifications, error } = await supabase
    .from('quote_enquiry_notifications')
    .select('*')
    .eq('status', 'pending')
    .limit(50);

  if (error) {
    errors.push(`Failed to fetch pending notifications: ${error.message}`);
    return { processed: 0, failed: 0, errors };
  }

  if (!notifications?.length) {
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
        quoteUrl: `${appUrl}/admin/quotes/${notif.quote_id}`,
      });

      await supabase
        .from('quote_enquiry_notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notif.id);
      processed++;
    } catch (e) {
      const errorMsg = `Quote ${notif.quote_id}: ${String(e)}`;
      errors.push(errorMsg);
      await supabase
        .from('quote_enquiry_notifications')
        .update({ status: 'failed', error_message: String(e) })
        .eq('id', notif.id);
      failed++;
    }
  }

  return { processed, failed, errors: errors.length ? errors : undefined };
}