'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { PushSubscription } from '@/lib/notifications/push';

export interface PushState {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  subscription: PushSubscription | null;
  loading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    supported: false,
    permission: 'default',
    subscribed: false,
    subscription: null,
    loading: true,
    error: null,
  });

  const supabase = createSupabaseClient();

  const checkSupport = useCallback(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setState(prev => ({ ...prev, supported }));
    return supported;
  }, []);

  const checkPermission = useCallback(async () => {
    if (!checkSupport()) return;
    const permission = await Notification.requestPermission();
    setState(prev => ({ ...prev, permission }));
    return permission;
  }, [checkSupport]);

  const checkSubscription = useCallback(async () => {
    if (!checkSupport()) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setState(prev => ({
        ...prev,
        subscribed: !!subscription,
        subscription: subscription ? {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(subscription.getKey('auth')!),
          },
        } : null,
        loading: false,
      }));
    } catch (error) {
      console.error('[Push] Check subscription failed:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [checkSupport]);

  const subscribe = useCallback(async () => {
    if (!checkSupport()) return { success: false, error: 'Not supported' };

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        setState(prev => ({ ...prev, loading: false, error: 'Permission denied' }));
        return { success: false, error: 'Permission denied' };
      }

      const vapidPublicKey = await getVapidPublicKey();
      if (!vapidPublicKey) {
        setState(prev => ({ ...prev, loading: false, error: 'VAPID key not configured' }));
        return { success: false, error: 'VAPID key not configured' };
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      const pushSubscription: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
      };

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: pushSubscription }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save subscription');
      }

      setState(prev => ({
        ...prev,
        subscribed: true,
        subscription: pushSubscription,
        loading: false,
        error: null,
      }));

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Subscription failed';
      setState(prev => ({ ...prev, loading: false, error: message }));
      return { success: false, error: message };
    }
  }, [checkSupport]);

  const unsubscribe = useCallback(async () => {
    if (!state.subscription) return { success: false, error: 'Not subscribed' };

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(state.subscription.endpoint)}`, {
        method: 'DELETE',
      });

      setState(prev => ({
        ...prev,
        subscribed: false,
        subscription: null,
        loading: false,
      }));

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unsubscribe failed';
      setState(prev => ({ ...prev, loading: false, error: message }));
      return { success: false, error: message };
    }
  }, [state.subscription]);

  useEffect(() => {
    checkSupport();
    checkPermission();
    checkSubscription();
  }, [checkSupport, checkPermission, checkSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    refresh: checkSubscription,
  };
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/push/vapid-key');
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey || null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}