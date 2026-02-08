/* سراج | Serag — Service Worker
   - Versioned cache
   - Network-first for navigation (HTML) to reduce stale UI
   - Cache-first for static assets
   Dev tip: bump CACHE_VERSION when you change files.
*/

const CACHE_VERSION = "serag-v1.0.0";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest"
  // Note: icons are optional. If you add them, include:
  // "./icons/icon-192.png",
  // "./icons/icon-512.png",
  // "./icons/icon-192-maskable.png",
  // "./icons/icon-512-maskable.png"
];

// Install: pre-cache core
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_VERSION ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

// Fetch strategy:
// - HTML navigations: network-first, fallback to cache
// - Other GET: cache-first, fallback to network, then cache
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  const isNav = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isNav) {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(cacheFirst(req));
  }
});

async function networkFirst(req) {
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    const cache = await caches.open(CACHE_VERSION);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(req);
    if (cached) return cached;
    // fallback to cached index for SPA-like navigations
    const fallback = await caches.match("./index.html");
    return fallback || new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_VERSION);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}
