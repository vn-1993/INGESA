const CACHE_NAME = 'ingesa-control-ejecutivo-v1';
const SHELL = [
  './',
  './panel-ejecutivo-real.html',
  './va93-panel-admin.html',
  './manifest.json',
  './ingesa-quota-meter.js',
  './assets/ingesa-official.png',
  './modulos/hilaturas.html',
  './modulos/log_stica.html',
  './modulos/maquinas_alarmas.html',
  './modulos/calidad_tejeduria.html'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isFirestoreOrDynamic(url) {
  return /firestore|googleapis\.com|gstatic\.com|firebaseio\.com|script\.google\.com|api\//i.test(url.href);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (isFirestoreOrDynamic(url)) return;

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request).then(response => {
        if (response && response.ok && request.destination !== 'document') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match(request).then(cached => cached || caches.match('./panel-ejecutivo-real.html')))
    );
  }
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
