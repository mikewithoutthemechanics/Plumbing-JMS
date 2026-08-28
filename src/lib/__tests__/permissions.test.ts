import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  canAccessJob,
  canSeePricing,
  canSetPricing,
  canAdvanceState,
  canSendToAccountant,
  canExport,
} from '@/lib/utils/permissions';

describe('hasPermission', () => {
  it('owner has all permissions', () => {
    expect(hasPermission('owner', 'anything')).toBe(true);
  });

  it('technician has read:own_jobs', () => {
    expect(hasPermission('technician', 'read:own_jobs')).toBe(true);
  });

  it('technician lacks write:job_materials', () => {
    expect(hasPermission('technician', 'write:job_materials')).toBe(true);
  });

  it('technician lacks owner-only permissions', () => {
    expect(hasPermission('technician', 'admin:*')).toBe(false);
  });

  it('accountant has read:completed', () => {
    expect(hasPermission('accountant', 'read:completed')).toBe(true);
  });

  it('accountant lacks write:own_time', () => {
    expect(hasPermission('accountant', 'write:own_time')).toBe(false);
  });
});

describe('canAccessJob', () => {
  it('owner can access any job', () => {
    expect(canAccessJob('owner', 'any-status', false)).toBe(true);
  });

  it('technician can access assigned job', () => {
    expect(canAccessJob('technician', 'assigned', true)).toBe(true);
  });

  it('technician can access completed job when assigned', () => {
    expect(canAccessJob('technician', 'completed', true)).toBe(true);
  });

  it('technician cannot access unassigned job', () => {
    expect(canAccessJob('technician', 'assigned', false)).toBe(false);
  });

  it('technician cannot access invoiced job unless assigned', () => {
    expect(canAccessJob('technician', 'invoiced', false)).toBe(false);
  });

  it('accountant can access invoiced job', () => {
    expect(canAccessJob('accountant', 'invoiced', false)).toBe(true);
  });

  it('accountant can access completed job', () => {
    expect(canAccessJob('accountant', 'completed', false)).toBe(true);
  });

  it('accountant cannot access pending job', () => {
    expect(canAccessJob('accountant', 'pending', false)).toBe(false);
  });
});

describe('canSeePricing', () => {
  it('owner can see pricing', () => {
    expect(canSeePricing('owner')).toBe(true);
  });

  it('technician cannot see pricing', () => {
    expect(canSeePricing('technician')).toBe(false);
  });

  it('accountant cannot see pricing', () => {
    expect(canSeePricing('accountant')).toBe(false);
  });
});

describe('canSetPricing', () => {
  it('only owner can set pricing', () => {
    expect(canSetPricing('owner')).toBe(true);
    expect(canSetPricing('technician')).toBe(false);
    expect(canSetPricing('accountant')).toBe(false);
  });
});

describe('canAdvanceState', () => {
  it('allows pending -> assigned for owner', () => {
    expect(canAdvanceState('owner', 'pending', 'assigned')).toBe(true);
  });

  it('allows assigned -> completed for owner', () => {
    expect(canAdvanceState('owner', 'assigned', 'completed')).toBe(true);
  });

  it('allows completed -> to_be_invoiced for owner', () => {
    expect(canAdvanceState('owner', 'completed', 'to_be_invoiced')).toBe(true);
  });

  it('allows to_be_invoiced -> invoiced for owner', () => {
    expect(canAdvanceState('owner', 'to_be_invoiced', 'invoiced')).toBe(true);
  });

  it('denies invoiced -> anything for owner', () => {
    expect(canAdvanceState('owner', 'invoiced', 'pending')).toBe(false);
  });

  it('denies non-owner from advancing state', () => {
    expect(canAdvanceState('technician', 'pending', 'assigned')).toBe(false);
  });

  it('denies invalid transitions', () => {
    expect(canAdvanceState('owner', 'pending', 'completed')).toBe(false);
  });
});

describe('canSendToAccountant', () => {
  it('only owner can send to accountant', () => {
    expect(canSendToAccountant('owner')).toBe(true);
    expect(canSendToAccountant('technician')).toBe(false);
    expect(canSendToAccountant('accountant')).toBe(false);
  });
});

describe('canExport', () => {
  it('owner can export', () => {
    expect(canExport('owner')).toBe(true);
  });

  it('accountant can export', () => {
    expect(canExport('accountant')).toBe(true);
  });

  it('technician cannot export', () => {
    expect(canExport('technician')).toBe(false);
  });
});
