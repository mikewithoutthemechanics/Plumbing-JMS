import { useEffect, useState } from 'react';
import { getPendingSyncItems } from '@/lib/db/dexie';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const hasInitialized = useRef(false);

  const updatePending = async () => {
    try {
      const items = await getPendingSyncItems();
      setPendingCount(items.length);
    } catch (error) {
      console.error('Failed to get pending sync items:', error);
    }
  };

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

    const interval = setInterval(updatePending, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const syncNow = async () => {
    setSyncing(true);
    try {
      const items = await getPendingSyncItems();
      for (const item of items) {
        try {
          const response = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table_name: item.table_name, operation: item.operation, payload: item.payload, id: item.id }),
          });
          if (response.ok) {
            const { db } = await import('@/lib/db/dexie');
            await db.syncQueue.delete(item.id);
          } else {
            const { db } = await import('@/lib/db/dexie');
            await db.syncQueue.update(item.id, { status: 'failed', retries: item.retries + 1 });
          }
        } catch (error) {
          console.error('Failed to sync item:', error);
          const { db } = await import('@/lib/db/dexie');
          await db.syncQueue.update(item.id, { status: 'failed', retries: item.retries + 1 });
        }
      }
      await updatePending();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`offline-indicator ${isOnline ? 'online' : 'offline'} fade-in-up`}
         title={pendingCount > 0 ? `${pendingCount} item${pendingCount !== 1 ? 's' : ''} waiting to sync` : ''}
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <span className="text-sm font-medium">🟢 Online</span>
            {pendingCount > 0 && (
              <button onClick={syncNow} disabled={syncing} className="btn btn-outline px-3 py-1 text-xs hover:bg-plumber-secondary/5">
                {syncing ? <span className="animate-spin h-3 w-3 mr-1"></span>Syncing... : `Sync ${pendingCount}`}
              </button>
            )}
          </>
        ) : (
          <span className="text-sm font-medium">🔴 Offline</span>
        )}
      </div>
    </div>
  );
}
