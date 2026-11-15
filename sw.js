// Offline support: every app file is cached on install, so HQ opens with no internet.
// Bump VERSION whenever any file changes so your devices pick up the update.
const VERSION = 'hq-v3';
const FILES = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './fonts/atkinson-hyperlegible-latin-400-normal.woff2', './fonts/atkinson-hyperlegible-latin-700-normal.woff2',
  './fonts/bricolage-grotesque-latin-600-normal.woff2', './fonts/bricolage-grotesque-latin-800-normal.woff2',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/phoenix.png',
  './js/app.js', './js/claude.js', './js/markdown.js', './js/dates.js', './js/db.js', './js/forms.js', './js/github.js', './js/parts.js', './js/state.js', './js/sync.js', './js/ui.js',
  './js/views/calendar.js', './js/views/contacts.js', './js/views/division.js', './js/views/home.js', './js/views/links.js', './js/views/settings.js', './js/views/tasks.js', './js/views/thoughts.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // GitHub sync goes straight to the network
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});
