/**
 * Permission utilities for Plumbing JMS
 * Defines role-based access control for owners, technicians, and accountants
 */

export type UserRole = 'owner' | 'technician' | 'accountant';

const ROLE_PERMISSIONS: Record<UserRole, Set<string>> = {
  owner: new Set(['*']),
  technician: new Set([
    'read:own_jobs',
    'write:own_time',
    'write:job_materials',
    'read:materials:no_price',
  ]),
  accountant: new Set([
    'read:completed',
    'read:invoiced',
    'read:audit',
    'export:completed',
  ]),
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  if (role === 'owner') return true;
  const perms = ROLE_PERMISSIONS[role];
  if (perms.has('*')) return true;
  return perms.has(permission);
}

/**
 * Job access control matrix: role -> jobStatus -> canAccess
 * true = can access, false = cannot access
 */
const JOB_ACCESS_MATRIX: Record<UserRole, Record<string, boolean>> = {
  owner: {
    pending: true,
    assigned: true,
    in_progress: true,
    completed: true,
    to_be_invoiced: true,
    invoiced: true,
  },
  technician: {
    pending: false,
    assigned: true,
    in_progress: true,
    completed: true,
    to_be_invoiced: true,
    invoiced: true,
  },
  accountant: {
    pending: false,
    assigned: false,
    in_progress: false,
    completed: true,
    to_be_invoiced: false,
    invoiced: true,
  },
};

/**
 * Check if a role can access a job based on status and assignment
 * Technicians can only access jobs assigned to them
 */
export function canAccessJob(role: UserRole, jobStatus: string, isAssignedTo: boolean): boolean {
  if (role === 'owner') return true;
  if (role === 'technician' && !isAssignedTo) return false;
  return JOB_ACCESS_MATRIX[role]?.[jobStatus] ?? false;
}

/**
 * Check if role can see pricing (owner only)
 */
export function canSeePricing(role: UserRole): boolean {
  return role === 'owner';
}

/**
 * Check if role can set pricing (owner only)
 */
export function canSetPricing(role: UserRole): boolean {
  return role === 'owner';
}

/**
 * Valid state transitions for jobs
 * Key: fromState, Value: array of allowed toStates
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['assigned'],
  assigned: ['in_progress', 'completed'],
  in_progress: ['completed'],
  completed: ['to_be_invoiced'],
  to_be_invoiced: ['invoiced'],
  invoiced: [],
};

/**
 * Check if a role can advance a job from one state to another
 * 
 * @param role - The user's role
 * @param fromState - Current job state
 * @param toState - Desired new state
 * @param isAssignedTo - Whether the user is assigned to this job (for technicians)
 * @returns true if the transition is allowed for this role
 */
export function canAdvanceState(
  role: UserRole,
  fromState: string,
  toState: string,
  isAssignedTo?: boolean
): boolean {
  const allowed = VALID_TRANSITIONS[fromState];
  if (!allowed?.includes(toState)) return false;
  if (role === 'owner') return true;
  if (role === 'technician' && isAssignedTo) {
    // Technicians can advance their assigned jobs through the workflow
    // They can move from any workflow state except 'invoiced' (terminal)
    return ['pending', 'assigned', 'in_progress', 'completed'].includes(fromState);
  }
  return false;
}

/**
 * Check if role can send job to accountant (owner only)
 */
export function canSendToAccountant(role: UserRole): boolean {
  return role === 'owner';
}

/**
 * Check if role can export data (owner or accountant)
 */
export function canExport(role: UserRole): boolean {
  return role === 'owner' || role === 'accountant';
}