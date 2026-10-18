// Service worker: guarda a app inteira para funcionar sem rede.
const CACHE = 'fastreport-__VERSION__';
const ASSETS = __ASSETS__;

// cache: 'reload' ignora a cache HTTP do GitHub Pages (10 min). Sem isto, a versão nova
// podia guardar o index.html antigo, que aponta para ficheiros que já não existem: ecrã branco.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('fastreport-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html', { cacheName: CACHE }).then((r) => r || fetch(req)));
    return;
  }
  event.respondWith(caches.match(req, { cacheName: CACHE }).then((r) => r || fetch(req)));
});
