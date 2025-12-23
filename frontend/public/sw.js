// DesiDealsAI Service Worker v2.0
// IMPORTANT: Increment version number on each deployment to bust cache
const SW_VERSION = '2.0.0';
const CACHE_NAME = `desidealsai-${SW_VERSION}`;
const DYNAMIC_CACHE = `desidealsai-dynamic-${SW_VERSION}`;
const IMAGE_CACHE = `desidealsai-images-${SW_VERSION}`;

// Assets to cache immediately on install
// Note: Don't cache index.html to ensure fresh content on each visit
const STATIC_ASSETS = [
  '/manifest.json',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE && key !== IMAGE_CACHE)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      console.log('[SW] New version activated:', SW_VERSION);
      // Notify all clients about the new version
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
        });
      });
    })
  );
  self.clients.claim();
});

// Listen for skip waiting message from the page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - network first for API and HTML/JS, cache first for images
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // API calls - network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // HTML and JS files - always network first to get fresh content
  // This fixes the "need to clear cache" issue
  if (request.destination === 'document' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname === '/') {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Images - cache first with network fallback
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // Other assets - stale while revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// Network first strategy (for API calls)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

// Cache first strategy (for images)
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return placeholder image for failed image requests
    return new Response('', { status: 404 });
  }
}

// Stale while revalidate (for other assets)
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, responseClone);
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dealId: data.dealId
    },
    actions: [
      { action: 'view', title: 'View Deal' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    tag: data.tag || 'deal-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-wishlist') {
    event.waitUntil(syncWishlist());
  }
  if (event.tag === 'sync-votes') {
    event.waitUntil(syncVotes());
  }
});

async function syncWishlist() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const pendingActions = await cache.match('/pending-wishlist');
  if (pendingActions) {
    const actions = await pendingActions.json();
    for (const action of actions) {
      try {
        await fetch('/api/wishlist', {
          method: action.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
      } catch (e) {
        console.error('Failed to sync wishlist action:', e);
      }
    }
    await cache.delete('/pending-wishlist');
  }
}

async function syncVotes() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const pendingVotes = await cache.match('/pending-votes');
  if (pendingVotes) {
    const votes = await pendingVotes.json();
    for (const vote of votes) {
      try {
        await fetch(`/api/deals/${vote.dealId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voteType: vote.voteType })
        });
      } catch (e) {
        console.error('Failed to sync vote:', e);
      }
    }
    await cache.delete('/pending-votes');
  }
}

// Periodic background sync for deal updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-deals') {
    event.waitUntil(updateDealsCache());
  }
});

async function updateDealsCache() {
  try {
    const response = await fetch('/api/deals?tab=frontpage&limit=50');
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put('/api/deals?tab=frontpage&limit=50', response);
    }
  } catch (e) {
    console.error('Failed to update deals cache:', e);
  }
}
