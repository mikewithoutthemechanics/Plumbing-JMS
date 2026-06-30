import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
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
