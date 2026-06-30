export type UserRole = 'owner' | 'technician' | 'accountant';

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner / Admin',
  technician: 'Technician',
  accountant: 'Accountant',
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: ['read', 'write', 'delete', 'admin', 'export', 'send_accountant'],
  technician: ['read:own_jobs', 'write:own_time', 'write:own_materials', 'read:own_jobs:no_pricing'],
  accountant: ['read:completed', 'read:invoiced', 'read:audit', 'export'],
};
