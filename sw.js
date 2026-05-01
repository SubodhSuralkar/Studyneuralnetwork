// ═══════════════════════════════════════════════════════════════════
// MHT-CET NEXUS — SERVICE WORKER
// Strategy: Cache-first for assets, Network-first for API calls.
// ═══════════════════════════════════════════════════════════════════

const CACHE_NAME = "nexus-cache-v1";
const OFFLINE_URL = "/";

// Assets to pre-cache on install (shell caching).
// Vite hashes filenames — we cache the root and let runtime
// caching handle the hashed bundles automatically.
const PRE_CACHE_URLS = [
	"/",
	"/manifest.json",
	"/logo-512.jpg",
	"/logo.jpg",
	"/smoke-detector-1.mp3",
];

// ── INSTALL ─────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(PRE_CACHE_URLS);
		}),
	);
	// Activate immediately — don't wait for old SW to die.
	self.skipWaiting();
});

// ── ACTIVATE ────────────────────────────────────────────────────────
// Delete stale caches from previous versions.
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) =>
				Promise.all(
					cacheNames
						.filter((name) => name !== CACHE_NAME)
						.map((name) => caches.delete(name)),
				),
			),
	);
	// Take control of all open clients immediately.
	self.clients.claim();
});

// ── FETCH ────────────────────────────────────────────────────────────
// Strategy:
//   • Navigation requests (HTML pages) → Network-first, fall back to cache.
//   • JS/CSS/image/font assets        → Cache-first, update in background.
//   • External requests               → Network only (no caching).
self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Ignore non-GET and cross-origin requests.
	if (request.method !== "GET" || url.origin !== self.location.origin) {
		return;
	}

	// Navigation requests — network first.
	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request)
				.then((response) => {
					// Clone and cache the fresh response.
					const clone = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					return response;
				})
				.catch(() =>
					// Offline fallback — serve cached root.
					caches.match(OFFLINE_URL),
				),
		);
		return;
	}

	// Asset requests — cache first, then network.
	event.respondWith(
		caches.match(request).then((cached) => {
			if (cached) {
				// Serve from cache; refresh cache in background (stale-while-revalidate).
				const fetchPromise = fetch(request).then((response) => {
					if (response && response.status === 200) {
						const clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					}
					return response;
				});
				// Return cached version immediately — don't wait for network.
				return cached;
			}
			// Not in cache — fetch and cache.
			return fetch(request).then((response) => {
				if (
					!response ||
					response.status !== 200 ||
					response.type === "opaque"
				) {
					return response;
				}
				const clone = response.clone();
				caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
				return response;
			});
		}),
	);
});
