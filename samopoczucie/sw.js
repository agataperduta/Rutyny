const CACHE = 'samopoczucie-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'badge-96.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('samopoczucie-') && k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // GitHub API i fonty idą normalnie
  // najpierw sieć (żeby aktualizacje docierały), offline z pamięci
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

// Powiadomienie wysłane przez GitHub Actions (skrypt w prywatnym repo „samopoczucie”)
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || '💭 Jak się czujesz?', {
    body: d.body || 'Powiedz kilka słów o tym, co teraz czujesz.',
    icon: 'icon-192.png',
    badge: 'badge-96.png',
    tag: 'samopoczucie',
    renotify: true,
    vibrate: [300, 120, 300],
    data: { url: d.url || './?z=alert' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './?z=alert', self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) {
      if (c.url.startsWith(self.registration.scope) && 'focus' in c) {
        c.postMessage({ typ: 'alert' });
        return c.focus();
      }
    }
    return clients.openWindow(target);
  }));
});
