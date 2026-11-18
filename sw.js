// Service worker for "המכולת שלנו".
// Lets the installed app open with no reception. The data itself is synced by Firestore's own offline cache;
// this only keeps the app shell (page, icons, Firebase SDK, fonts) available.
// Bump VERSION whenever a deploy should replace the cached files.
const VERSION = "v2"; // v2: drops any page cached by v1 (which could have cached an error page)
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const NAV_TIMEOUT = 3000; // ms
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

  // The page: network first so updates show up right away — but never wait more than NAV_TIMEOUT on a weak
  // signal (a stalled request doesn't fail, it just hangs); then open the saved copy.
  // Only a real, successful page is ever saved, so an error page can't replace the app.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const network = fetch(req).then(res => {
        if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(SHELL).then(c => c.put("./index.html", copy)); }
        return res;
      });
      try {
        return await Promise.race([network, new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), NAV_TIMEOUT))]);
      } catch (e) {
        const cached = await caches.match("./index.html");
        return cached || network;   // nothing saved yet: keep waiting for the network
      }
    })());
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
    .then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; })
    .catch(() => cached);
  return cached || network;
}
