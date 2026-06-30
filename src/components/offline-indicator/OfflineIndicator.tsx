'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingSyncItems } from '@/lib/db/dexie';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const hasInitialized = useRef(false);

  const updatePending = useCallback(async () => {
    const items = await getPendingSyncItems();
    setPendingCount(items.length);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      updatePending();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!hasInitialized.current && navigator.onLine) {
      hasInitialized.current = true;
      updatePending();
    }

    const interval = setInterval(updatePending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [updatePending]);

  const syncNow = async () => {
    setSyncing(true);
    const items = await getPendingSyncItems();
    for (const item of items) {
      try {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: item.table, operation: item.operation, payload: item.payload, id: item.id }),
        });
        if (response.ok) {
          const { db } = await import('@/lib/db/dexie');
          await db.syncQueue.delete(item.id);
        } else {
          const { db } = await import('@/lib/db/dexie');
          await db.syncQueue.update(item.id, { status: 'failed', retries: item.retries + 1 });
        }
      } catch {
        const { db } = await import('@/lib/db/dexie');
        await db.syncQueue.update(item.id, { status: 'failed', retries: item.retries + 1 });
      }
    }
    setPendingCount(0);
    setSyncing(false);
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`offline-indicator ${isOnline ? 'online' : 'offline'}`}>
      <div className="flex items-center gap-3">
        <span>{isOnline ? '🟢 Online' : '🔴 Offline'}</span>
        {pendingCount > 0 && (
          <button onClick={syncNow} disabled={syncing} className="text-xs bg-white/20 px-2 py-1 rounded">
            {syncing ? 'Syncing...' : `Sync ${pendingCount}`}
          </button>
        )}
      </div>
    </div>
  );
}
