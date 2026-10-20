// Stempeluhr – Service Worker: App offline verfügbar machen
const CACHE = 'stempeluhr-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Netz zuerst (für Updates), nach 2.5 s oder offline aus dem Cache
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fallback = () => { if (!done) { done = true; caches.match('./index.html').then(r => resolve(r || fetch(req))); } };
      const timer = setTimeout(fallback, 2500);
      fetch(req).then(res => {
        clearTimeout(timer);
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
        if (!done) { done = true; resolve(res); }
      }).catch(() => { clearTimeout(timer); fallback(); });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
