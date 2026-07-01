// Hontalin PWA Service Worker
// Version is injected via cache name — bump CACHE_VERSION on breaking changes
const CACHE_VERSION = "v2";
const STATIC_CACHE  = "hontalin-static-"  + CACHE_VERSION;
const DYNAMIC_CACHE = "hontalin-dynamic-" + CACHE_VERSION;

// Assets to precache on install (shell)
const PRECACHE_URLS = ["/"];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: prune old caches ────────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  const VALID = [STATIC_CACHE, DYNAMIC_CACHE];
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !VALID.includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  const { request } = e;

  // Only intercept GET requests on http/https — skip everything else
  if (request.method !== "GET") return;
  if (!request.url.startsWith("http")) return;

  const url = new URL(request.url);

  // Never cache — API routes, NextAuth, RSC payloads, webpack HMR
  const skip =
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.searchParams.has("_rsc") ||
    url.pathname === "/favicon.ico";
  if (skip) return;

  // ── Cache-first: Next.js static chunks (immutable hashed filenames) ──────
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // ── Cache-first: icons, fonts, images ───────────────────────────────────
  if (
    url.pathname.startsWith("/icons/") ||
    url.hostname.includes("fonts.gstatic.com") ||
    /\.(png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot)$/.test(url.pathname)
  ) {
    e.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // ── Network-first: HTML pages — fall back to cache, then offline shell ───
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        // Return the cached page or the root shell as last resort
        return cached || caches.match("/") || Response.error();
      })
  );
});
