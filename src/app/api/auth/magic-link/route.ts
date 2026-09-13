import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: max 3 requests per 10 minutes per client IP.
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { ok, retryAfterSec } = rateLimit(ip, 3, 10 * 60 * 1000);
    if (!ok) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { error } = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({
        email,
        create_user: true,
      }),
    }).then(res => res.json());

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to send magic link' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Magic link sent' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
