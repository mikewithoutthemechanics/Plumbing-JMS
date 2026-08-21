import type { EmailParams } from './types';

const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY || '';
const AGENTMAIL_INBOX_ID = process.env.AGENTMAIL_INBOX_ID || 'punctualplumbers@agentmail.to';

export async function sendViaAgentMail({ to, subject, html, text }: EmailParams): Promise<{ message_id: string }> {
  if (!AGENTMAIL_API_KEY) {
    throw new Error('AGENTMAIL_API_KEY not configured');
  }

  const res = await fetch(`https://api.agentmail.to/v0/inboxes/${AGENTMAIL_INBOX_ID}/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AGENTMAIL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AgentMail send failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  const messageId = data.id || data.message_id;
  if (!messageId) {
    throw new Error(`AgentMail response missing message ID: ${JSON.stringify(data)}`);
  }
  return { message_id: messageId };
}