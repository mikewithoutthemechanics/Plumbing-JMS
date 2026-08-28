import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  canAccessJob,
  canSeePricing,
  canSetPricing,
  canAdvanceState,
  canSendToAccountant,
  canExport,
} from '../utils/permissions';

describe('permissions', () => {
  // hasPermission
  it('owner has all permissions', () => {
    expect(hasPermission('owner', 'anything')).toBe(true);
  });

  it('technician has own_jobs permission', () => {
    expect(hasPermission('technician', 'read:own_jobs')).toBe(true);
  });

  it('technician lacks pricing permission', () => {
    expect(hasPermission('technician', 'write:pricing')).toBe(false);
  });

  it('accountant has export permission', () => {
    expect(hasPermission('accountant', 'export:completed')).toBe(true);
  });

  // canAccessJob
  it('owner can access any job', () => {
    expect(canAccessJob('owner', 'pending', false)).toBe(true);
  });

  it('technician cannot access pending job', () => {
    expect(canAccessJob('technician', 'pending', false)).toBe(false);
  });

  it('technician can access assigned job when assigned', () => {
    expect(canAccessJob('technician', 'assigned', true)).toBe(true);
  });

  it('technician cannot access assigned job when not assigned', () => {
    expect(canAccessJob('technician', 'assigned', false)).toBe(false);
  });

  it('accountant can access completed job', () => {
    expect(canAccessJob('accountant', 'completed', false)).toBe(true);
  });

  it('accountant cannot access in_progress job', () => {
    expect(canAccessJob('accountant', 'in_progress', false)).toBe(false);
  });

  it('unknown role returns false', () => {
    expect(canAccessJob('unknown' as any, 'pending', false)).toBe(false);
  });

  // canSeePricing / canSetPricing
  it('owner can see and set pricing', () => {
    expect(canSeePricing('owner')).toBe(true);
    expect(canSetPricing('owner')).toBe(true);
  });

  it('technician cannot see or set pricing', () => {
    expect(canSeePricing('technician')).toBe(false);
    expect(canSetPricing('technician')).toBe(false);
  });

  // canAdvanceState
  it('owner can advance any valid transition', () => {
    expect(canAdvanceState('owner', 'pending', 'assigned')).toBe(true);
    expect(canAdvanceState('owner', 'assigned', 'in_progress')).toBe(true);
  });

  it('rejects invalid transitions for owner', () => {
    expect(canAdvanceState('owner', 'pending', 'completed')).toBe(false);
  });

  it('technician can advance from pending to assigned', () => {
    expect(canAdvanceState('technician', 'pending', 'assigned', true)).toBe(true);
  });

  it('technician can advance from assigned to in_progress', () => {
    expect(canAdvanceState('technician', 'assigned', 'in_progress', true)).toBe(true);
  });

  it('technician can advance from in_progress to completed', () => {
    expect(canAdvanceState('technician', 'in_progress', 'completed', true)).toBe(true);
  });

  it('technician can advance from completed to to_be_invoiced', () => {
    expect(canAdvanceState('technician', 'completed', 'to_be_invoiced', true)).toBe(true);
  });

  it('technician cannot advance from invoiced', () => {
    expect(canAdvanceState('technician', 'invoiced', 'completed', true)).toBe(false);
  });

  it('technician not assigned cannot advance', () => {
    expect(canAdvanceState('technician', 'assigned', 'in_progress', false)).toBe(false);
  });

  // canSendToAccountant
  it('only owner can send to accountant', () => {
    expect(canSendToAccountant('owner')).toBe(true);
    expect(canSendToAccountant('technician')).toBe(false);
    expect(canSendToAccountant('accountant')).toBe(false);
  });

  // canExport
  it('owner and accountant can export', () => {
    expect(canExport('owner')).toBe(true);
    expect(canExport('accountant')).toBe(true);
  });

  it('technician cannot export', () => {
    expect(canExport('technician')).toBe(false);
  });
});
