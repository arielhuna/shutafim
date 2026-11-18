// Service worker for "המכולת שלנו".
// Lets the installed app open with no reception. The data itself is synced by Firestore's own offline cache;
// this only keeps the app shell (page, icons, Firebase SDK, fonts) available.
// Bump VERSION whenever a deploy should replace the cached files.
const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const SHELL_FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-64.png"];
// Static third-party files that are safe to keep (versioned URLs / fonts)
const CACHEABLE_HOSTS = ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // The page: network first so updates show up right away; cached copy when offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(SHELL).then(c => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Own static files: cache first, refresh in the background
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, SHELL));
    return;
  }

  // Firebase SDK + fonts: cache first, refresh in the background.
  // Firestore traffic (firestore.googleapis.com) is never touched here.
  if (CACHEABLE_HOSTS.includes(url.hostname) && !url.pathname.includes("/channel")) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME));
  }
});

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then(res => { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; })
    .catch(() => cached);
  return cached || network;
}
