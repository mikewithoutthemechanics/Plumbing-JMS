import { describe, it, expect } from 'vitest';
import {
  jobInputSchema,
  invoiceInputSchema,
  paymentInputSchema,
  procurementItemSchema,
  procurementInputSchema,
  scheduleItemSchema,
  scheduleInputSchema,
  staffInputSchema,
  whatsappConfigInputSchema,
  magicLinkInputSchema,
  exportInputSchema,
  validateJobInput,
  validateInvoiceInput,
  validatePaymentInput,
  validateProcurementInput,
  validateScheduleInput,
  validateStaffInput,
  validateWhatsAppConfigInput,
  validateMagicLinkInput,
  validateExportInput,
} from '@/lib/validation';

describe('jobInputSchema', () => {
  it('accepts valid input', () => {
    const result = jobInputSchema.safeParse({
      customer_id: '123e4567-e89b-12d3-a456-426614174000',
      description: 'Fix leaky faucet',
      admin_hourly_rate: 150,
      assigned_to: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid customer_id', () => {
    const result = jobInputSchema.safeParse({ customer_id: 'not-a-uuid', description: 'test', admin_hourly_rate: 100 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid customer ID');
    }
  });

  it('rejects description longer than 500 chars', () => {
    const longDesc = 'a'.repeat(501);
    const result = jobInputSchema.safeParse({ customer_id: '123e4567-e89b-12d3-a456-426614174000', description: longDesc, admin_hourly_rate: 100 });
    expect(result.success).toBe(false);
  });

  it('rejects negative admin_hourly_rate', () => {
    const result = jobInputSchema.safeParse({ customer_id: '123e4567-e89b-12d3-a456-426614174000', description: 'test', admin_hourly_rate: -10 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid assigned_to uuid', () => {
    const result = jobInputSchema.safeParse({ customer_id: '123e4567-e89b-12d3-a456-426614174000', description: 'test', admin_hourly_rate: 100, assigned_to: 'bad' });
    expect(result.success).toBe(false);
  });

  it('rejects admin_notes longer than 1000 chars', () => {
    const longNotes = 'a'.repeat(1001);
    const result = jobInputSchema.safeParse({ customer_id: '123e4567-e89b-12d3-a456-426614174000', description: 'test', admin_hourly_rate: 100, admin_notes: longNotes });
    expect(result.success).toBe(false);
  });
});

describe('invoiceInputSchema', () => {
  it('accepts valid job_card_id', () => {
    const result = invoiceInputSchema.safeParse({ job_card_id: '123e4567-e89b-12d3-a456-426614174000' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid job_card_id', () => {
    const result = invoiceInputSchema.safeParse({ job_card_id: 'bad' });
    expect(result.success).toBe(false);
  });
});

describe('paymentInputSchema', () => {
  it('accepts valid payment', () => {
    const result = paymentInputSchema.safeParse({
      invoice_id: '123e4567-e89b-12d3-a456-426614174000',
      amount: 100.50,
      method: 'card',
      note: 'Paid via card',
    });
    expect(result.success).toBe(true);
  });

  it('defaults method to cash', () => {
    const result = paymentInputSchema.safeParse({
      invoice_id: '123e4567-e89b-12d3-a456-426614174000',
      amount: 50,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.method).toBe('cash');
    }
  });

  it('rejects zero amount', () => {
    const result = paymentInputSchema.safeParse({ invoice_id: '123e4567-e89b-12d3-a456-426614174000', amount: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects amount over 1000000', () => {
    const result = paymentInputSchema.safeParse({ invoice_id: '123e4567-e89b-12d3-a456-426614174000', amount: 1000001 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid method', () => {
    const result = paymentInputSchema.safeParse({ invoice_id: '123e4567-e89b-12d3-a456-426614174000', amount: 100, method: 'crypto' });
    expect(result.success).toBe(false);
  });
});

describe('procurementItemSchema', () => {
  it('accepts material_id only', () => {
    const result = procurementItemSchema.safeParse({ material_id: '123e4567-e89b-12d3-a456-426614174000', quantity: 2 });
    expect(result.success).toBe(true);
  });

  it('accepts custom_name only', () => {
    const result = procurementItemSchema.safeParse({ custom_name: 'Custom Widget', quantity: 3 });
    expect(result.success).toBe(true);
  });

  it('accepts both material_id and custom_name', () => {
    const result = procurementItemSchema.safeParse({ material_id: '123e4567-e89b-12d3-a456-426614174000', custom_name: 'Widget', quantity: 1 });
    expect(result.success).toBe(true);
  });

  it('rejects when neither material_id nor custom_name provided', () => {
    const result = procurementItemSchema.safeParse({ quantity: 2 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer quantity', () => {
    const result = procurementItemSchema.safeParse({ material_id: '123e4567-e89b-12d3-a456-426614174000', quantity: 2.5 });
    expect(result.success).toBe(false);
  });

  it('rejects quantity over 10000', () => {
    const result = procurementItemSchema.safeParse({ material_id: '123e4567-e89b-12d3-a456-426614174000', quantity: 10001 });
    expect(result.success).toBe(false);
  });
});

describe('procurementInputSchema', () => {
  it('accepts valid input', () => {
    const result = procurementInputSchema.safeParse({
      items: [{ material_id: '123e4567-e89b-12d3-a456-426614174000', quantity: 2 }],
      message: 'Please deliver',
      send_method: 'email',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = procurementInputSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid send_method', () => {
    const result = procurementInputSchema.safeParse({ items: [{ material_id: '123e4567-e89b-12d3-a456-426614174000', quantity: 2 }], send_method: 'sms' });
    expect(result.success).toBe(false);
  });
});

describe('scheduleItemSchema', () => {
  it('accepts valid schedule item', () => {
    const result = scheduleItemSchema.safeParse({
      profile_id: '123e4567-e89b-12d3-a456-426614174000',
      date: '2024-06-15',
      status: 'available',
      notes: 'On site',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid date format', () => {
    const result = scheduleItemSchema.safeParse({
      profile_id: '123e4567-e89b-12d3-a456-426614174000',
      date: '15/06/2024',
      status: 'available',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = scheduleItemSchema.safeParse({
      profile_id: '123e4567-e89b-12d3-a456-426614174000',
      date: '2024-06-15',
      status: 'maybe',
    });
    expect(result.success).toBe(false);
  });
});

describe('scheduleInputSchema', () => {
  it('accepts array with one item', () => {
    const result = scheduleInputSchema.safeParse([{
      profile_id: '123e4567-e89b-12d3-a456-426614174000',
      date: '2024-06-15',
      status: 'available',
    }]);
    expect(result.success).toBe(true);
  });

  it('rejects empty array', () => {
    const result = scheduleInputSchema.safeParse([]);
    expect(result.success).toBe(false);
  });
});

describe('staffInputSchema', () => {
  it('accepts valid staff input', () => {
    const result = staffInputSchema.safeParse({
      email: 'tech@example.com',
      full_name: 'Tech User',
      role: 'technician',
      phone: '+27123456789',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = staffInputSchema.safeParse({ email: 'bad-email', full_name: 'Tech', role: 'technician' });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 chars when provided', () => {
    const result = staffInputSchema.safeParse({ email: 'tech@example.com', full_name: 'Tech', role: 'technician', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = staffInputSchema.safeParse({ email: 'tech@example.com', full_name: 'Tech', role: 'admin' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone format', () => {
    const result = staffInputSchema.safeParse({ email: 'tech@example.com', full_name: 'Tech', role: 'technician', phone: 'abc' });
    expect(result.success).toBe(false);
  });
});

describe('whatsappConfigInputSchema', () => {
  it('accepts valid config', () => {
    const result = whatsappConfigInputSchema.safeParse({
      base_url: 'https://wa.example.com',
      session_name: 'main',
      enabled: true,
      reminder_template: 'Hello {{customer_name}}',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid URL', () => {
    const result = whatsappConfigInputSchema.safeParse({ base_url: 'not-a-url', reminder_template: 'Hi' });
    expect(result.success).toBe(false);
  });

  it('rejects empty reminder_template', () => {
    const result = whatsappConfigInputSchema.safeParse({ base_url: 'https://wa.example.com', reminder_template: '' });
    expect(result.success).toBe(false);
  });

  it('rejects reminder_template longer than 500 chars', () => {
    const result = whatsappConfigInputSchema.safeParse({ base_url: 'https://wa.example.com', reminder_template: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe('magicLinkInputSchema', () => {
  it('accepts valid email', () => {
    const result = magicLinkInputSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = magicLinkInputSchema.safeParse({ email: 'bad-email' });
    expect(result.success).toBe(false);
  });
});

describe('exportInputSchema', () => {
  it('accepts valid jobIds array', () => {
    const result = exportInputSchema.safeParse({ jobIds: ['123e4567-e89b-12d3-a456-426614174000'] });
    expect(result.success).toBe(true);
  });

  it('rejects empty jobIds array', () => {
    const result = exportInputSchema.safeParse({ jobIds: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid job id', () => {
    const result = exportInputSchema.safeParse({ jobIds: ['bad-id'] });
    expect(result.success).toBe(false);
  });
});

describe('validateJobInput helper', () => {
  it('returns empty array for valid input', () => {
    expect(validateJobInput({ customer_id: '123e4567-e89b-12d3-a456-426614174000', description: 'test', admin_hourly_rate: 100 })).toEqual([]);
  });

  it('returns errors for invalid input', () => {
    const errors = validateJobInput({ customer_id: 'bad', description: 'test', admin_hourly_rate: -5 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('Invalid customer ID'))).toBe(true);
  });
});

describe('validatePaymentInput helper', () => {
  it('returns empty array for valid input', () => {
    expect(validatePaymentInput({ invoice_id: '123e4567-e89b-12d3-a456-426614174000', amount: 50 })).toEqual([]);
  });

  it('returns errors for invalid input', () => {
    const errors = validatePaymentInput({ invoice_id: 'bad', amount: 0 });
    expect(errors.some(e => e.includes('Invalid invoice ID'))).toBe(true);
    expect(errors.some(e => e.includes('Payment amount must be positive'))).toBe(true);
  });
});
