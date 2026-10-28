/* Kana PWA – offline cache (kana-v3) */
const CACHE = 'kana-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest',
                './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // stránky – VŽDY čerstvé z webu, jen offline poslouží uložená verze
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return resp;
      }).catch(() => caches.open(CACHE).then(c => c.match('./index.html')))
    );
    return;
  }

  // ikony a manifest – z cache, aktualizace proběhne na pozadí
  e.respondWith(
    caches.open(CACHE).then(c =>
      c.match(req).then(hit => {
        const network = fetch(req).then(resp => {
          if (resp && resp.ok) c.put(req, resp.clone());
          return resp;
        }).catch(() => hit);
        return hit || network;
      })
    )
  );
});
