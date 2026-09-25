const APP_ROOT = new URL('./', self.location.href);
const CACHE_PREFIX = `dng-codex-static:${APP_ROOT.pathname}:`;
const CACHE = `${CACHE_PREFIX}v37-fresh-pages`;
const inScope = url => url.origin === APP_ROOT.origin && url.pathname.startsWith(APP_ROOT.pathname);
self.addEventListener('install', event => {
  const shell = ['./', 'icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'manifest.webmanifest', 'manifest.en.webmanifest'].map(path => new URL(path, APP_ROOT).href);
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(shell)));
  self.skipWaiting();
});
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_GAME' || !Array.isArray(event.data.urls)) return;
  const urls = [...new Set(event.data.urls)].filter(url => { try { return inScope(new URL(url, APP_ROOT)); } catch { return false; } });
  event.waitUntil(caches.open(CACHE).then(cache => Promise.allSettled(urls.map(url => cache.add(url)))));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !inScope(new URL(request.url))) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // These are same-origin immutable game files. Vite's Vary: Origin must not
    // make a warmed URL miss when a module is later requested with CORS mode.
    if (request.mode !== 'navigate') { const cached = await cache.match(request, { ignoreVary: true }); if (cached) return cached; }
    try {
      // The page itself always asks the server: HTTP caching kept a stale page
      // (and its stale styles) for ten minutes after every release.
      const response = request.mode === 'navigate'
        ? await fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' })
        : await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(request, { ignoreVary: true }) || (request.mode === 'navigate' ? await cache.match(APP_ROOT.href) : null);
      if (cached) return cached;
      throw error;
    }
  })());
});
