// Hontalin PWA Service Worker v4
const CACHE_VERSION = "v4";
const STATIC_CACHE  = "hontalin-static-"  + CACHE_VERSION;
const DYNAMIC_CACHE = "hontalin-dynamic-" + CACHE_VERSION;

// ── Install: activate immediately, no precaching ──────────────────────────────
// Do NOT use cache.addAll() here — "/" redirects to /login (302) which the
// Cache API rejects, causing the install to fail and the SW to never activate.
// Chrome requires an activated SW before it fires beforeinstallprompt.
self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting());
});

// ── Activate: claim all clients and prune stale caches ───────────────────────
self.addEventListener("activate", (e) => {
  const VALID = [STATIC_CACHE, DYNAMIC_CACHE];
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !VALID.includes(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  const { request } = e;

  // Only handle GET on http/https — return early for everything else
  if (request.method !== "GET") return;
  if (!request.url.startsWith("http")) return;

  const url = new URL(request.url);

  // Never intercept: API routes, NextAuth, RSC payloads, HMR
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.searchParams.has("_rsc")
  ) return;

  // ── Cache-first: immutable Next.js static bundles ─────────────────────────
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) caches.open(STATIC_CACHE).then((c) => c.put(request, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // ── Cache-first: icons and images ─────────────────────────────────────────
  if (
    url.pathname.startsWith("/icons/") ||
    /\.(png|jpg|jpeg|svg|gif|webp|woff2?|ttf)$/.test(url.pathname)
  ) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) caches.open(STATIC_CACHE).then((c) => c.put(request, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // ── Network-first: HTML pages ─────────────────────────────────────────────
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) caches.open(DYNAMIC_CACHE).then((c) => c.put(request, res.clone()));
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Last resort: serve whatever cached page we have
        const fallback = await caches.match("/dashboard") || await caches.match("/login");
        return fallback || Response.error();
      })
  );
});
