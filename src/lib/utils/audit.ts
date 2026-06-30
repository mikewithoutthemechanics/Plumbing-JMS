import type { AuditLog } from '@/types';

export async function logAudit(
  params: {
    tableName: AuditLog['table_name'];
    recordId: string;
    action: AuditLog['action'];
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    changedBy: string;
    ipAddress?: string;
  },
): Promise<void> {
  try {
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table_name: params.tableName,
        record_id: params.recordId,
        action: params.action,
        old_values: sanitizeForAudit(params.oldValues || {}),
        new_values: sanitizeForAudit(params.newValues || {}),
        changed_by: params.changedBy,
        ip_address: params.ipAddress,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Audit] Failed to log audit:', response.status, errorText);
    }
  } catch (error) {
    console.error('[Audit] Error logging audit:', error);
  }
}

export function sanitizeForAudit(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'admin_unit_price'];
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some(f => key.toLowerCase().includes(f))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForAudit(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}