import { NextResponse } from 'next/server';
import { processJobAssignedNotifications, processQuoteEnquiryNotifications } from '@/lib/notifications/service';

const CRON_SECRET = process.env.CRON_SECRET;

function verifyCronAuth(req: Request): boolean {
  if (!CRON_SECRET) return false;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${CRON_SECRET}`;
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
  // Require cron auth for POST as well (prevents unauthenticated notification triggering)
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