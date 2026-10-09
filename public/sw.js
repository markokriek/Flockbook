// Increment this version whenever the offline page or icons change.
const CACHE = "flockbook-static-v1";
const STATIC = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC)));
});

// Updates wait for explicit user consent; never interrupt a form automatically.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("flockbook-static-") && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    // Do not store authenticated HTML or farm data on shared devices.
    event.respondWith(
      fetch(request).catch(async () => (await caches.match("/offline.html")) || Response.error()),
    );
    return;
  }
  if (STATIC.includes(url.pathname) && !url.search) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
  // API calls, server functions, auth, and user data always go to the network.
});
