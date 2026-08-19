import { sendViaAgentMail } from './agentmail';

const FROM_NAME = process.env.FROM_NAME || 'Punctual Plumbers';
const OWNER_NOTIFICATION_EMAIL = process.env.OWNER_NOTIFICATION_EMAIL || 'punctualplumbers@outlook.co.za';

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
      <p>Hi ${technicianName},</p>
      <p>A new job has been assigned to you:</p>
      <ul>
        <li><strong>Job:</strong> ${jobNumber}</li>
        <li><strong>Customer:</strong> ${customerName}</li>
      </ul>
      <p><a href="${jobUrl}">View job in Plumbing JMS</a></p>
      <p>Regards,<br/>${FROM_NAME}</p>
    `;
  await sendViaAgentMail({
    to,
    subject: `New job assigned: ${jobNumber}`,
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
      <p>Hi ${customerName},</p>
      <p>Your job <strong>${jobNumber}</strong> status is now <strong>${status}</strong>.</p>
      <p>Regards,<br/>${FROM_NAME}</p>
    `;
  await sendViaAgentMail({
    to,
    subject: `Job ${jobNumber} update`,
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
        <li><strong>Name:</strong> ${customerName}</li>
        <li><strong>Email:</strong> ${customerEmail}</li>
        <li><strong>Phone:</strong> ${customerPhone}</li>
        <li><strong>Description:</strong> ${description}</li>
      </ul>
      <p><a href="${quoteUrl}">View quote in Admin</a></p>
    `;
  await sendViaAgentMail({
    to: OWNER_NOTIFICATION_EMAIL,
    subject: `New enquiry from ${customerName}`,
    html,
  });
  return { message_id: 'agentmail' };
}