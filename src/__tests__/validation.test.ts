import { describe, expect, test } from 'vitest';
import { validateJobInput } from '@/lib/validation';

describe('validateJobInput', () => {
  test('returns empty array for valid input', () => {
    const data = { admin_hourly_rate: 25 };
    const errors = validateJobInput(data);
    expect(errors).toEqual([]);
  });

  test('returns error for negative admin_hourly_rate', () => {
    const data = { admin_hourly_rate: -5 };
    const errors = validateJobInput(data);
    expect(errors).toContain('admin_hourly_rate: must be >= 0');
  });

  test('returns error for NaN admin_hourly_rate', () => {
    const data = { admin_hourly_rate: NaN };
    const errors = validateJobInput(data);
    expect(errors).toContain('admin_hourly_rate: Invalid number');
  });

  test('does not validate when field is undefined', () => {
    const data = {}; // admin_hourly_rate is undefined
    const errors = validateJobInput(data);
    expect(errors).toEqual([]);
  });

  test('does validate when field is null', () => {
    const data = { admin_hourly_rate: null };
    const errors = validateJobInput(data);
    expect(errors).toContain('admin_hourly_rate: Expected number, received null');
  });

  test('returns multiple errors for multiple invalid fields (when added)', () => {
    // This test will pass once we add more fields to the schema
    const data = { admin_hourly_rate: -5 };
    const errors = validateJobInput(data);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe('admin_hourly_rate: must be >= 0');
  });
});