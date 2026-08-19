export interface JobAssignedPayload {
  job_card_id: string;
  technician_id: string;
  customer_name: string;
  job_number: string;
}

export interface EnquiryPayload {
  quote_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  description?: string;
}

export type NotificationPayload = JobAssignedPayload | EnquiryPayload;

export interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}