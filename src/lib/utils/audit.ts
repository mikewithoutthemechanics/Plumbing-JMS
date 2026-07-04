import type { AuditLog } from "@/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function logAudit(params: {
  tableName: AuditLog["table_name"];
  recordId: string;
  action: AuditLog["action"];
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedBy: string;
  ipAddress?: string;
}): Promise<void> {
  // Resolve IP address: use provided ip, otherwise try to extract from request headers
  let ip = params.ipAddress;
  if (!ip) {
    try {
      const headersList = await headers();
      const forwarded = headersList.get("x-forwarded-for");
      if (forwarded) {
        ip = forwarded.split(",")[0].trim();
      } else {
        ip = headersList.get("x-real-ip") ?? "unknown";
      }
    } catch {
      // If headers() fails (e.g., called outside request context), fall back to unknown
      ip = "unknown";
    }
  }

  try {
    const supabase = await getSupabaseAdminClient();
    const { error } = await supabase.from("audit_log").insert({
      table_name: params.tableName,
      record_id: params.recordId,
      action: params.action,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
      changed_by: params.changedBy,
      ip_address: ip,
    });

    if (error) {
      console.error("[Audit] Failed to log audit:", error);
    }
  } catch (error) {
    console.error("[Audit] Error logging audit:", error);
  }
}

export function sanitizeForAudit(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "api_key",
    "admin_unit_price",
  ];
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some((f) => key.toLowerCase().includes(f))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeForAudit(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}