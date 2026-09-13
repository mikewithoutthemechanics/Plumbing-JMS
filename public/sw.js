// Service Worker for Push Notifications
// This file is served from /sw.js

const CACHE_NAME = 'plumbing-jms-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache each asset individually, following redirects
      for (const url of STATIC_ASSETS) {
        try {
          const response = await fetch(url, { redirect: 'follow' });
          if (response.ok) {
            await cache.put(url, response);
          } else {
            console.warn(`[SW] Skipping cache of ${url}: ${response.status}`);
          }
        } catch (error) {
          console.error(`[SW] Failed to fetch and cache ${url}:`, error);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

const SKIP_PATHS = [
  '/auth/callback',
  '/magic-link',
  '/api/',
];

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Skip service worker for auth/redirect paths and API routes
  if (SKIP_PATHS.some(p => url.pathname.startsWith(p))) return;

  // Only cache GET requests for our static assets
  const isStaticAsset = STATIC_ASSETS.includes(url.pathname);
  
  // Only intercept static assets we want to cache; let others pass through
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(event.request, { redirect: 'follow' });
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          await caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      } catch (error) {
        console.error('[SW] Fetch error:', error);
        return cached || new Response('Network error', { status: 504 });
      }
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();

    const options = {
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/badge-72.png',
      data: payload.data || {},
      actions: payload.actions || [],
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      timestamp: payload.timestamp || Date.now(),
      vibrate: payload.vibrate || [200, 100, 200],
      tag: payload.data?.tag || 'plumbing-jms-notification',
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(payload.title, options)
    );
  } catch (error) {
    console.error('[SW] Push parse error:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  let targetUrl = '/';

  if (action && data.actions) {
    const actionConfig = data.actions.find((a) => a.action === action);
    if (actionConfig?.url) targetUrl = actionConfig.url;
  } else if (data.url) {
    targetUrl = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(targetUrl));
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
