/* StartPage Mobile — service worker.
 * Caches the app SHELL (the single-file engine + wizard + icons) so the app
 * launches and runs fully on-device/offline after the first load. Live data
 * (Yahoo / AI / the Cloudflare Worker) is cross-origin and is NEVER cached —
 * those requests always hit the network so prices are never stale, matching the
 * dashboard's own "no stale prices" rule.
 *
 * Bump CACHE when the shell changes so old caches are evicted on activate.
 */
const CACHE = 'startpage-shell-v2';
const SHELL = [
  './',
  './index.html',
  './wizard.html',
  './config.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon-180.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // never touch POSTs (AI calls etc.)
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;        // let cross-origin data/AI/Worker hit network directly

  // Same-origin shell: serve cached immediately, refresh in the background
  // (stale-while-revalidate). Falls back to cache when offline.
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((resp) => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return resp;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
