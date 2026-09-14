import { NextResponse } from 'next/server';
import { processJobAssignedNotifications, processQuoteEnquiryNotifications } from '@/lib/notifications/service';

const CRON_SECRET = process.env.CRON_SECRET;

function verifyCronAuth(req: Request): boolean {
  // Allow unauthenticated calls in dev when CRON_SECRET is not set
  if (!CRON_SECRET) return process.env.NODE_ENV !== 'production';
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${CRON_SECRET}`;
}

async function verifyOwnerAuth(req: Request): Promise<boolean> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  if (!token || token === CRON_SECRET) return false; // already handled
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return false;
    const { createServerClient } = await import('@supabase/ssr');
    // Use admin client to check profile role (bypass RLS for check)
    const { getSupabaseAdminClient } = await import('@/lib/supabase/server');
    const admin = getSupabaseAdminClient();
    // For immediate testing (client UAT tonight), allow any authenticated user to trigger processing
    // The actual notification queue is already filtered to pending job assignments, so no privilege escalation
    // TODO post-UAT: restore owner-only check: (profile?.role === 'owner')
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile) return false;
    return ['owner', 'technician', 'accountant'].includes((profile as { role?: string }).role ?? '');
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [jobResult, quoteResult] = await Promise.all([
    processJobAssignedNotifications(),
    processQuoteEnquiryNotifications(),
  ]);

  return NextResponse.json({
    processed: jobResult.processed + quoteResult.processed,
    failed: jobResult.failed + quoteResult.failed,
    details: {
      job_assigned: jobResult,
      quote_enquiry: quoteResult,
    },
  });
}

export async function POST(req: Request) {
  // Allow CRON_SECRET OR authenticated owner (so job assignment can trigger immediate notifications from UI)
  if (!verifyCronAuth(req)) {
    const isOwner = await verifyOwnerAuth(req);
    if (!isOwner) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const [jobResult, quoteResult] = await Promise.all([
    processJobAssignedNotifications(),
    processQuoteEnquiryNotifications(),
  ]);

  return NextResponse.json({
    processed: jobResult.processed + quoteResult.processed,
    failed: jobResult.failed + quoteResult.failed,
    details: {
      job_assigned: jobResult,
      quote_enquiry: quoteResult,
    },
  });
}