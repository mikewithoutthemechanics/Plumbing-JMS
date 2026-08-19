import { NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/rate-limiter';
import { processJobAssignedNotifications, processQuoteEnquiryNotifications } from '@/lib/notifications/service';

export async function POST(req: Request) {
  const ip = new URL(req.url).searchParams.get('ip') || (req.headers.get('x-forwarded-for') || 'unknown');
  const ratelimit = await checkApiRateLimit(ip);
  if (!ratelimit.allowed) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
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