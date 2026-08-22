import webpush from 'web-push';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@plumbing-jms.com';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn('[Push] VAPID keys not configured - push notifications disabled');
}

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
}

export function isPushConfigured(): boolean {
  return !!(vapidPublicKey && vapidPrivateKey);
}

export function getVapidPublicKey(): string | undefined {
  return vapidPublicKey;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  if (!isPushConfigured()) {
    return { success: false, error: 'Push not configured' };
  }

  try {
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (error) {
    const webpushError = error as webpush.WebPushError;
    if (webpushError.statusCode === 410 || webpushError.statusCode === 404) {
      return { success: false, error: 'Subscription expired' };
    }
    console.error('[Push] Send failed:', error);
    return { success: false, error: webpushError.message || 'Unknown error' };
  }
}

export async function sendPushToMultiple(
  subscriptions: PushSubscription[],
  payload: PushPayload
): Promise<{ sent: number; failed: number; expired: string[] }> {
  const expired: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendPushNotification(sub, payload);
      if (result.success) {
        sent++;
      } else if (result.error === 'Subscription expired') {
        failed++;
        expired.push(sub.endpoint);
      } else {
        failed++;
      }
    })
  );

  return { sent, failed, expired };
}