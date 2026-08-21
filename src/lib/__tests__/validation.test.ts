import { describe, it, expect } from 'vitest';
import { validateJobInput, validatePaymentInput, validateStaffInput } from '../validation';

describe('validation', () => {
  it('validateJobInput returns empty for valid data', () => {
    const errors = validateJobInput({ description: 'Test job' });
    expect(errors).toEqual([]);
  });

  it('validateJobInput returns errors for invalid data', () => {
    const errors = validateJobInput({ description: '' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('validatePaymentInput rejects negative amount', () => {
    const errors = validatePaymentInput({
      invoice_id: '00000000-0000-0000-0000-000000000000',
      amount: -5,
      method: 'cash',
    });
    expect(errors.some(e => e.includes('Payment amount must be positive'))).toBe(true);
  });

  it('validateStaffInput rejects invalid email', () => {
    const errors = validateStaffInput({
      email: 'not-an-email',
      full_name: 'John Doe',
      role: 'technician',
    });
    expect(errors.some(e => e.includes('Invalid email address'))).toBe(true);
  });
});
