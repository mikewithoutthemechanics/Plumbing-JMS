import { sendViaAgentMail } from './agentmail';

const FROM_NAME = process.env.FROM_NAME || 'Punctual Plumbers';
const OWNER_NOTIFICATION_EMAIL = process.env.OWNER_NOTIFICATION_EMAIL || 'punctualplumbers@outlook.co.za';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

export async function sendJobAssignedEmail({
  to,
  technicianName,
  customerName,
  jobNumber,
  jobUrl,
}: {
  to: string;
  technicianName: string;
  customerName: string;
  jobNumber: string;
  jobUrl: string;
}) {
  const html = `
      <p>Hi ${escapeHtml(technicianName)},</p>
      <p>A new job has been assigned to you:</p>
      <ul>
        <li><strong>Job:</strong> ${escapeHtml(jobNumber)}</li>
        <li><strong>Customer:</strong> ${escapeHtml(customerName)}</li>
      </ul>
      <p><a href="${escapeHtml(jobUrl)}">View job in Plumbing JMS</a></p>
      <p>Regards,<br/>${escapeHtml(FROM_NAME)}</p>
    `;
  await sendViaAgentMail({
    to,
    subject: `New job assigned: ${escapeHtml(jobNumber)}`,
    html,
  });
  return { message_id: 'agentmail' };
}

export async function sendJobStatusChangedEmail({
  to,
  customerName,
  jobNumber,
  status,
}: {
  to: string;
  customerName: string;
  jobNumber: string;
  status: string;
}) {
  const html = `
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>Your job <strong>${escapeHtml(jobNumber)}</strong> status is now <strong>${escapeHtml(status)}</strong>.</p>
      <p>Regards,<br/>${escapeHtml(FROM_NAME)}</p>
    `;
  await sendViaAgentMail({
    to,
    subject: `Job ${escapeHtml(jobNumber)} update`,
    html,
  });
  return { message_id: 'agentmail' };
}

export async function sendEnquiryEmail({
  customerName,
  customerEmail,
  customerPhone,
  description,
  quoteUrl,
}: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  quoteUrl: string;
}) {
  const html = `
      <p>New enquiry received via WebApp</p>
      <ul>
        <li><strong>Name:</strong> ${escapeHtml(customerName)}</li>
        <li><strong>Email:</strong> ${escapeHtml(customerEmail)}</li>
        <li><strong>Phone:</strong> ${escapeHtml(customerPhone)}</li>
        <li><strong>Description:</strong> ${escapeHtml(description)}</li>
      </ul>
      <p><a href="${escapeHtml(quoteUrl)}">View quote in Admin</a></p>
    `;
  await sendViaAgentMail({
    to: OWNER_NOTIFICATION_EMAIL,
    subject: `New enquiry from ${escapeHtml(customerName)}`,
    html,
  });
  return { message_id: 'agentmail' };
}