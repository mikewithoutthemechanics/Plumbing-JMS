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

export function hasPermission(role: UserRole, permission: string): boolean {
  if (role === 'owner') return true;
  const perms = ROLE_PERMISSIONS[role];
  if (perms.has('*')) return true;
  return perms.has(permission);
}

export function canAccessJob(role: UserRole, jobStatus: string, isAssignedTo: boolean): boolean {
  switch (role) {
    case 'owner':
      return true;
    case 'technician':
      if (!isAssignedTo) return false;
      if (jobStatus === 'invoiced') return true;
      if (['assigned', 'in_progress', 'completed'].includes(jobStatus)) return true;
      return false;
    case 'accountant':
      return jobStatus === 'invoiced' || jobStatus === 'completed';
    default:
      return false;
  }
}

export function canSeePricing(role: UserRole): boolean {
  return role === 'owner';
}

export function canSetPricing(role: UserRole): boolean {
  return role === 'owner';
}

export function canAdvanceState(role: UserRole, fromState: string, toState: string): boolean {
  if (role !== 'owner') return false;
  const allowed: Record<string, string[]> = {
    pending: ['assigned'],
    assigned: ['in_progress'],
    in_progress: ['completed'],
    completed: ['invoiced'],
    invoiced: [],
  };
  return allowed[fromState]?.includes(toState) ?? false;
}

export function canSendToAccountant(role: UserRole): boolean {
  return role === 'owner';
}

export function canExport(role: UserRole): boolean {
  return role === 'owner' || role === 'accountant';
}
