// Réseau d'abord (toujours du frais), cache en secours hors ligne.
const V = 'agora-v16';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Les fichiers .json sont mis en cache sous une clé fixe, sans le paramètre ?t=
  const key = url.pathname.endsWith('.json') ? url.pathname : e.request;
  e.respondWith(
    fetch(e.request)
      .then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(key, c)); } return r; })
      .catch(() => caches.match(key))
  );
});
