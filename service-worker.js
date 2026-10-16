const SHELL_CACHE_NAME = "box-this-lap-shell-v1";
const OFFLINE_DATA_PATHS = ["data/footy-schedule.json", "data/rankings.json"];
function stampSavedResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("X-BoxThisLap-Saved-At", String(Date.now()));
  return new Response(response.body, {status:response.status, statusText:response.statusText, headers});
}
const FOOTY_PUSH_ENDPOINT = "https://box-this-lap-footy-push.boxthislap.workers.dev";
const IMAGE_CACHE_NAME = "box-this-lap-images-v2";
const IMAGE_CACHE_META = new URL("__image_cache_metadata", self.location.origin).href;
const IMAGE_CACHE_LIMIT = 100 * 1024 * 1024;
const CLOUD_IMAGE_ORIGINS = new Set([
  "https://box-this-lap-footy-notes.boxthislap.workers.dev",
  "https://box-this-lap-image-library.boxthislap.workers.dev",
]);
let cacheMutation = Promise.resolve();
function mutateCache(work) {
  const next = cacheMutation.then(work, work);
  cacheMutation = next.catch(() => undefined);
  return next;
}
const IMAGE_MANIFEST_URL = "assets/image-cache-manifest.json";
const IMAGE_EXTENSIONS = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const DRAFT_MANAGER_CACHE = 'box-this-lap-draft-manager-v1';
const DRAFT_MANAGER_KEY = new URL('./draft-manager', self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const response = await fetch("offline-manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Offline manifest unavailable.");
    const files = await response.json();
    const cache = await caches.open(SHELL_CACHE_NAME);
    await cache.addAll(files.map(path => new Request(new URL(path, self.registration.scope), { cache: "reload" })));
    for (const path of OFFLINE_DATA_PATHS) {
      const response = await cache.match(new URL(path, self.registration.scope));
      if (response) await cache.put(new URL(path, self.registration.scope), stampSavedResponse(response));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([clients.claim(), caches.delete("box-this-lap-images-v1")]));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isOfflineData = OFFLINE_DATA_PATHS.some(path => url.pathname === new URL(path, self.registration.scope).pathname);
  if (event.request.method === "GET" && url.origin === self.location.origin && isOfflineData) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE_NAME);
      const response = await fetch(event.request, { cache: "no-store" });
      if (response.ok) {
        try { await cache.put(event.request, stampSavedResponse(response.clone())); } catch { /* Keep a successful online load usable. */ }
      }
      return response;
    })());
    return;
  }
  if (event.request.method === "GET" && url.origin === self.location.origin &&
      (event.request.mode === "navigate" || url.pathname.includes("/build/") || url.pathname === new URL("assets/final/offline-header.jpg", self.registration.scope).pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE_NAME);
      try {
        const response = await fetch(event.request, { cache: "no-store" });
        if (response.ok) {
          const key = event.request.mode === "navigate" ? new URL("index.html", self.registration.scope) : event.request;
          try { await cache.put(key, response.clone()); } catch { /* Keep a successful online load usable. */ }
        }
        return response;
      } catch (error) {
        // Only a network outage can reopen the installed app; HTTP errors stay visible.
        const cached = await cache.match(event.request, { ignoreSearch: true, ignoreVary: true }) ||
          (event.request.mode === "navigate" ? await cache.match(new URL("index.html", self.registration.scope), { ignoreVary: true }) : null);
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }
  if (event.request.method !== "GET" || !isCacheableImageRequest(event.request)) {
    return;
  }

  event.respondWith(serveCachedImage(event.request, event));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "OFFLINE_STATUS") {
    event.source?.postMessage({ type: "OFFLINE_READY" });
  } else if (event.data?.type === 'DRAFT_MANAGER') {
    event.waitUntil((async () => {
      const managerId = String(event.data.managerId || '');
      const cache = await caches.open(DRAFT_MANAGER_CACHE);
      await cache.put(DRAFT_MANAGER_KEY, new Response(managerId));
      const notifications = await self.registration.getNotifications();
      for (const notification of notifications) {
        if (notification.tag.startsWith('box-this-lap-draft-') && notification.data?.managerId !== managerId) notification.close();
      }
    })());

  } else if (event.data?.type === "CACHE_ALL_IMAGES") {
    event.waitUntil(cacheAllImages(event.source));
  } else if (event.data?.type === "INVALIDATE_IMAGE") {
    event.waitUntil((async () => {
      try {
        const request = new Request(event.data.url);
        if (!isCacheableImageRequest(request)) throw new Error("Unapproved image route.");
        const cache = await caches.open(IMAGE_CACHE_NAME);
        await cache.delete(imageCacheKey(request));
        event.ports[0]?.postMessage({ ok: true });
      } catch { event.ports[0]?.postMessage({ ok: false }); }
    })());
  } else if (event.data?.type === "CLEAR_IMAGE_CACHE") {
    event.waitUntil(clearImageCache(event.source));
  }
});

self.addEventListener("push", (event) => {
  event.waitUntil(showPendingFootyNotifications());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "./#footy";

  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({ includeUncontrolled: true, type: "window" });
    const existingClient = windowClients.find((client) => "focus" in client);

    if (existingClient) {
      await existingClient.navigate(targetUrl);
      return existingClient.focus();
    }

    return clients.openWindow(targetUrl);
  })());
});

async function showPendingFootyNotifications() {
  if (!FOOTY_PUSH_ENDPOINT) {
    await self.registration.showNotification("Box This Lap", {
      body: "A match alert is ready.",
      data: { url: "./#footy" },
      tag: "box-this-lap-footy-alert",
    });
    return;
  }

  const subscription = await self.registration.pushManager.getSubscription();

  if (!subscription?.endpoint) {
    return;
  }

  const response = await fetch(`${FOOTY_PUSH_ENDPOINT.replace(/\/$/, "")}/pending`, {
    body: JSON.stringify({ endpoint: subscription.endpoint }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    await self.registration.showNotification("Box This Lap", {
      body: "A match alert is ready.",
      data: { url: "./#footy" },
      tag: "box-this-lap-footy-alert",
    });
    return;
  }

  const data = await response.json();
  const notifications = Array.isArray(data.notifications) ? data.notifications : [];
  const managerCache = await caches.open(DRAFT_MANAGER_CACHE);
  const savedManager = await managerCache.match(DRAFT_MANAGER_KEY);
  const managerId = savedManager ? await savedManager.text() : '';

  if (notifications.length === 0) {
    return;
  }

  await Promise.all(notifications.filter((notification) => !String(notification.tag || '').startsWith('box-this-lap-draft-') || (managerId && String(notification.managerId) === managerId)).map((notification) =>
    self.registration.showNotification(notification.title || "Match alert", {
      body: notification.body || "",
      data: { url: notification.url || "./#footy", managerId: notification.managerId || '' },
      tag: notification.tag || `box-this-lap-footy-${Date.now()}`,
    })
  ));
}

function isCacheableImageRequest(request) {
  const url = new URL(request.url);
  return (url.origin === self.location.origin &&
    (request.destination === "image" || IMAGE_EXTENSIONS.test(url.pathname))) ||
    (CLOUD_IMAGE_ORIGINS.has(url.origin) && /^\/media\/(rosters|match-images|library)\//.test(url.pathname));
}
function imageCacheKey(request) {
  const url = new URL(request.url);
  url.searchParams.delete("__image_retry");
  return new Request(url.href, { mode: "cors", credentials: "omit" });
}
async function readMetadata(cache) {
  const response = await cache.match(IMAGE_CACHE_META);
  const value = response ? await response.json().catch(() => null) : null;
  const metadata = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const requests = await cache.keys(), present = new Set();
  for (const request of requests) {
    if (request.url === IMAGE_CACHE_META) continue;
    present.add(request.url);
    const entry = metadata[request.url];
    if (!entry || !Number.isFinite(entry.bytes) || entry.bytes < 0 || !Number.isFinite(entry.used)) {
      const image = await cache.match(request);
      if (image) metadata[request.url] = { bytes: (await image.blob()).size, used: 0 };
    }
  }
  for (const url of Object.keys(metadata)) if (!present.has(url)) delete metadata[url];
  return metadata;
}
async function storeImage(cache, request, response) {
  if (!response.ok || response.type === "opaque") return;
  const bytes = (await response.clone().blob()).size;
  if (bytes > IMAGE_CACHE_LIMIT) return;
  const key = imageCacheKey(typeof request === "string" ? new Request(new URL(request, self.registration.scope).href) : request);
  await mutateCache(async () => {
    const metadata = await readMetadata(cache);
    const stored = new Response(response.clone().body, response);
    stored.headers.set("X-BTL-Cached-At", String(Date.now()));
    await cache.put(key, stored);
    metadata[key.url] = { bytes, used: Date.now() };
    let total = Object.values(metadata).reduce((sum, value) => sum + value.bytes, 0);
    const entries = Object.entries(metadata).sort((a, b) => a[1].used - b[1].used);
    while (total > IMAGE_CACHE_LIMIT || entries.length > 2000) {
      const [url, value] = entries.shift(); total -= value.bytes; delete metadata[url]; await cache.delete(url);
    }
    await cache.put(IMAGE_CACHE_META, Response.json(metadata));
  });
}
async function serveCachedImage(request, event) {
  let cache, cached;
  const key = imageCacheKey(request);
  try {
    cache = await caches.open(IMAGE_CACHE_NAME);
    cached = await cache.match(key);
    if (cached && new URL(request.url).origin === self.location.origin && Date.now() - Number(cached.headers.get('X-BTL-Cached-At') || 0) > 7 * 86400000) {
      await cache.delete(key); cached = null;
    }
    if (cached) {
      // Decode stored raster bytes before returning them, so corrupt copies fall back to the origin.
      const mime = cached.headers.get("Content-Type") || "";
      if (typeof createImageBitmap === "function" && /image\/(png|jpeg|webp|avif|gif)/.test(mime)) {
        const bitmap = await createImageBitmap(await cached.clone().blob()); bitmap.close();
      }
      event.waitUntil(mutateCache(async () => {
        const metadata = await readMetadata(cache);
        if (metadata[key.url]) { metadata[key.url].used = Date.now(); await cache.put(IMAGE_CACHE_META, Response.json(metadata)); }
      }).catch(() => undefined));
      return cached;
    }
  } catch {
    if (cache) await cache.delete(key).catch(() => undefined);
  }
  // Cache storage and decode failures do not prevent fetching or displaying the image.
  const url = new URL(request.url);
  const response = await fetch(new Request(request, {
    ...(url.origin !== self.location.origin ? { mode: "cors", credentials: "omit" } : {}),
    cache: cached ? "reload" : "default",
  }));
  if (cache && response.ok) event.waitUntil(storeImage(cache, key, response).catch(() => undefined));
  return response;
}

async function cacheAllImages(client) {
  try {
    const manifestResponse = await fetch(IMAGE_MANIFEST_URL, { cache: "no-store" });

    if (!manifestResponse.ok) {
      throw new Error(`Image list unavailable (${manifestResponse.status}).`);
    }

    const manifest = await manifestResponse.json();
    const images = Array.isArray(manifest.images) ? manifest.images : [];
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const manifestPaths = new Set(images.map((image) => new URL(image.path, self.registration.scope).pathname));
    const existingRequests = await cache.keys();
    await Promise.all(existingRequests.map((request) => {
      const url = new URL(request.url);
      return url.origin !== self.location.origin || request.url === IMAGE_CACHE_META || manifestPaths.has(url.pathname) ? undefined : cache.delete(request);
    }));
    let completed = 0;
    let bytes = 0;
    const failed = [];

    for (const batch of chunk(images, 3)) {
      await Promise.all(batch.map(async (image) => {
        try {
          const key = new Request(new URL(image.path, self.registration.scope).href);
          const existing = await cache.match(key);
          if (!existing) {
            const response = await fetchImageWithRetry(image.path);
            await storeImage(cache, key, response);
          }
          bytes += Number(image.bytes || 0);
        } catch (error) {
          failed.push({ message: error.message || "Unknown error.", path: image.path });
        } finally {
          completed += 1;
        }
      }));
      postToClient(client, { type: "IMAGE_CACHE_PROGRESS", completed, total: images.length });
    }

    postToClient(client, {
      type: "IMAGE_CACHE_COMPLETE",
      bytes,
      failed: failed.length,
      saved: images.length - failed.length,
      total: images.length,
    });
  } catch (error) {
    postToClient(client, { type: "IMAGE_CACHE_ERROR", message: error.message || "Unknown error." });
  }
}

async function fetchImageWithRetry(path, attempts = 3) {
  let lastStatus = 0;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      lastStatus = response.status;

      if (response.ok) {
        return response;
      }

      if (response.status < 500 || attempt === attempts) {
        break;
      }

      await delay(300 * attempt);
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }

      await delay(300 * attempt);
    }
  }

  throw new Error(`Unable to save ${path}${lastStatus ? ` (${lastStatus})` : ""}.`);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function clearImageCache(client) {
  await caches.delete(IMAGE_CACHE_NAME);
  postToClient(client, { type: "IMAGE_CACHE_CLEARED" });
}

function chunk(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function postToClient(client, message) {
  client?.postMessage?.(message);
}
