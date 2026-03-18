/**
 * Barista Spotlight — Service Worker
 *
 * Cache strategy:
 *   - Cache-first for static assets (CSS, JS, images)
 *   - Network-first for API calls
 * Offline fallback:
 *   - Serves cached /offline page when network fails
 * Score queue:
 *   - IndexedDB-based offline score entry queue
 */

const CACHE_NAME = 'barista-spotlight-v1';

const STATIC_ASSETS = [
  '/',
  '/offline',
  '/static/css/pico.min.css',
  '/static/css/app.css',
  '/static/js/ws-client.js',
  '/static/js/scoring.js',
  '/static/manifest.json',
];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ──────────────────────────────────────────────────────────────────

/**
 * Determine whether a request targets the API.
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

/**
 * Determine whether a request targets a static asset.
 */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/static/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  );
}

/**
 * Cache-first: try the cache, fall back to the network and update the cache.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match('/offline');
  }
}

/**
 * Network-first: try the network, fall back to the cache.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match('/offline');
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(event.request));
  } else if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request));
  } else {
    // Navigation and everything else: network-first
    event.respondWith(networkFirst(event.request));
  }
});

// ─── Offline Score Queue (IndexedDB stub) ───────────────────────────────────

const DB_NAME = 'barista-spotlight';
const DB_VERSION = 1;
const SCORE_STORE = 'offline-scores';

/**
 * Open (or create) the IndexedDB database for offline score storage.
 */
function openScoreDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(SCORE_STORE)) {
        const store = db.createObjectStore(SCORE_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Enqueue a score entry while offline.
 * Each entry: { baristaId, contestId, criteria, value, timestamp, synced }
 */
async function enqueueScore(scoreData) {
  const db = await openScoreDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCORE_STORE, 'readwrite');
    const store = tx.objectStore(SCORE_STORE);
    store.add({
      ...scoreData,
      timestamp: Date.now(),
      synced: false,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieve all un-synced scores from the queue.
 */
async function getPendingScores() {
  const db = await openScoreDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCORE_STORE, 'readonly');
    const store = tx.objectStore(SCORE_STORE);
    const index = store.index('synced');
    const request = index.getAll(false);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark a score as synced after successful upload.
 */
async function markScoreSynced(id) {
  const db = await openScoreDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCORE_STORE, 'readwrite');
    const store = tx.objectStore(SCORE_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) {
        record.synced = true;
        store.put(record);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Attempt to sync all pending scores to the server.
 * Called on reconnect / periodic sync.
 */
async function syncPendingScores() {
  const pending = await getPendingScores();
  for (const score of pending) {
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(score),
      });
      if (res.ok) {
        await markScoreSynced(score.id);
      }
    } catch {
      // Still offline — stop trying until next sync event
      break;
    }
  }
}

// Listen for the sync event (Background Sync API)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-scores') {
    event.waitUntil(syncPendingScores());
  }
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_SCORES') {
    syncPendingScores();
  }
});
