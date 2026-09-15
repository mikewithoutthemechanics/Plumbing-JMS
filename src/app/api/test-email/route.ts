import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  let user: { id: string; email?: string } | null = null;
  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    console.log('[TestEmail] getUser with token', { hasUser: !!data.user, error: error?.message });
    user = data.user as unknown as { id: string; email?: string } | null;
  }
  if (!user) {
    const { data } = await supabase.auth.getUser();
    console.log('[TestEmail] getUser via cookies', { hasUser: !!data.user });
    user = data.user as unknown as { id: string; email?: string } | null;
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile, error: profErr } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  console.log('[TestEmail] profile', { userId: user.id, role: (profile as unknown as { role?: string })?.role, profErr: profErr?.message });
  if ((profile as unknown as { role?: string })?.role !== 'owner') return NextResponse.json({ error: 'Forbidden', role: (profile as unknown as { role?: string })?.role }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const to = body.to || 'ballitoai@gmail.com';
  const subject = body.subject || 'Test email from Plumbing-JMS';
  const html = body.html || `<p>Hi Ballito Accountant,</p><p>This is a test email from Plumbing-JMS at ${new Date().toISOString()}.</p><p>If you see this, AgentMail is working.</p>`;

  try {
    const { sendViaAgentMail } = await import('@/lib/notifications/agentmail');
    console.log('[TestEmail] sending to', to);
    const res = await sendViaAgentMail({ to, subject, html });
    console.log('[TestEmail] sent', res);
    return NextResponse.json({ success: true, to, message_id: res.message_id });
  } catch (e) {
    console.error('[TestEmail] failed', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
