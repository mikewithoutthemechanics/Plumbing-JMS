import { describe, test, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { usePushNotifications } from './usePushNotifications';

describe('usePushNotifications hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('initial state has loading true and supported false', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.loading).toBe(true);
    expect(result.current.supported).toBe(false);
  });

  test('checkSupport returns true when serviceWorker and PushManager exist', async () => {
    const mockReady = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
      },
    };

    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: { ready: Promise.resolve(mockReady) },
      configurable: true,
    });
    Object.defineProperty(global, 'PushManager', {
      value: function PushManager() {},
      configurable: true,
    });
    (global as any).Notification = {
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };

    const { result } = renderHook(() => usePushNotifications());

    // Wait for the useEffect to complete
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.supported).toBe(true);

    delete (global.navigator as any).serviceWorker;
    delete (global as any).PushManager;
    delete (global as any).Notification;
  });

  test('subscribe returns not supported when unsupported', async () => {
    const { result } = renderHook(() => usePushNotifications());

    let subscribeResult: any;
    await act(async () => {
      subscribeResult = await result.current.subscribe();
    });

    expect(subscribeResult.success).toBe(false);
    expect(subscribeResult.error).toBe('Not supported');
  });
});
