const FOOTY_PUSH_ENDPOINT = "https://box-this-lap-footy-push.boxthislap.workers.dev";
const IMAGE_CACHE_NAME = "box-this-lap-images-v1";
const IMAGE_MANIFEST_URL = "assets/image-cache-manifest.json";
const IMAGE_EXTENSIONS = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !isCacheableImageRequest(event.request)) {
    return;
  }

  event.respondWith(serveCachedImage(event.request, event));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_ALL_IMAGES") {
    event.waitUntil(cacheAllImages(event.source));
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

  if (notifications.length === 0) {
    return;
  }

  await Promise.all(notifications.map((notification) =>
    self.registration.showNotification(notification.title || "Match alert", {
      body: notification.body || "",
      data: { url: notification.url || "./#footy" },
      tag: notification.tag || `box-this-lap-footy-${Date.now()}`,
    })
  ));
}

function isCacheableImageRequest(request) {
  const url = new URL(request.url);
  return url.origin === self.location.origin &&
    (request.destination === "image" || IMAGE_EXTENSIONS.test(url.pathname));
}

async function serveCachedImage(request, event) {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const cachedResponse = await cache.match(request, { ignoreSearch: true });
  const refreshPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      await cache.put(request, response.clone());
    } else if (response.status === 404 || response.status === 410) {
      await cache.delete(request, { ignoreSearch: true });
    }
    return response;
  });

  if (cachedResponse) {
    event.waitUntil(refreshPromise.catch(() => undefined));
    return cachedResponse;
  }

  return refreshPromise;
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
      return manifestPaths.has(new URL(request.url).pathname) ? undefined : cache.delete(request);
    }));
    let completed = 0;
    let bytes = 0;

    for (const batch of chunk(images, 6)) {
      await Promise.all(batch.map(async (image) => {
        const response = await fetch(image.path, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Unable to save ${image.path} (${response.status}).`);
        }

        await cache.put(image.path, response);
        completed += 1;
        bytes += Number(image.bytes || 0);
      }));
      postToClient(client, { type: "IMAGE_CACHE_PROGRESS", completed, total: images.length });
    }

    postToClient(client, { type: "IMAGE_CACHE_COMPLETE", bytes, total: images.length });
  } catch (error) {
    postToClient(client, { type: "IMAGE_CACHE_ERROR", message: error.message || "Unknown error." });
  }
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
