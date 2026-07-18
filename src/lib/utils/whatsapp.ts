import { environment } from '@/lib/constants/env';

export interface OpenWaConfig {
  baseUrl: string;
  sessionName: string;
  enabled: boolean;
  reminderTemplate: string;
}

export function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`
  );
}

export async function sendWhatsappMessage(
  config: OpenWaConfig,
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!config.enabled) return { success: false, error: 'WhatsApp automation disabled' };
  if (!config.baseUrl) return { success: false, error: 'OpenWA base URL not configured' };

  const number = to.replace(/[^\d]/g, '');
  const url = `${config.baseUrl.replace(/\/$/, '')}/api/${config.sessionName}/sendText`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: `${number}@c.us`, text: message }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, error: `OpenWA ${res.status}: ${text.slice(0, 200)}` };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export const whatsappSupported = !!environment.supabaseUrl;
