import { validateJobInput } from '@/lib/validation';

describe('validateJobInput', () => {
  it('returns error for negative admin_hourly_rate', () => {
    const errors = validateJobInput({ admin_hourly_rate: -10 });
    expect(errors).toContain('admin_hourly_rate must be a non-negative number');
  });

  it('returns no error for positive admin_hourly_rate', () => {
    const errors = validateJobInput({ admin_hourly_rate: 25 });
    expect(errors).toHaveLength(0);
  });

  it('returns error for non-numeric admin_hourly_rate', () => {
    const errors = validateJobInput({ admin_hourly_rate: 'abc' });
    expect(errors).toContain('admin_hourly_rate must be a non-negative number');
  });

  it('returns no error for zero', () => {
    const errors = validateJobInput({ admin_hourly_rate: 0 });
    expect(errors).toHaveLength(0);
  });

  it('returns no error when admin_hourly_rate is undefined', () => {
    const errors = validateJobInput({});
    expect(errors).toHaveLength(0);
  });
});
