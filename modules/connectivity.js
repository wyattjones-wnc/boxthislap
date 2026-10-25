// Browser connectivity describes the network interface, not Internet reachability.
export const CONNECTIVITY_TIMEOUT_MS = 4000;
let unreachable = false;
let initialized = false;
export function isAppOnline() {
  return navigator.onLine && !unreachable;
}
export function reportConnectivity(reachable) {
  const previous = isAppOnline();
  unreachable = !reachable;
  if (previous !== isAppOnline())
    window.dispatchEvent(new Event("boxthislap:connectivity"));
}
export function isConnectionFailure(error) {
  return (
    !error?.status &&
    (error instanceof TypeError ||
      error?.name === "TimeoutError" ||
      error?.name === "NetworkError")
  );
}
export async function withConnectionDeadline(loader) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(loader),
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new DOMException(
                "Connection too slow. Using offline mode.",
                "TimeoutError",
              ),
            ),
          CONNECTIVITY_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export function initializeConnectivity() {
  if (initialized) return;
  initialized = true;
  let checking = false;
  const check = async () => {
    if (checking || !navigator.onLine || document.visibilityState === "hidden")
      return;
    checking = true;
    const controller = new AbortController();
    try {
      // This URL is not handled by the service worker's cache fallback.
      const url = new URL("manifest.webmanifest", document.baseURI);
      url.searchParams.set("connectivity", String(Date.now()));
      await withConnectionDeadline(async () => {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return; // HTTP errors do not establish a network outage.
        const manifest = await response.json();
        if (manifest.name) reportConnectivity(true);
      });
    } catch (error) {
      if (isConnectionFailure(error)) reportConnectivity(false);
    } finally {
      controller.abort();
      checking = false;
    }
  };
  window.addEventListener("online", check);
  window.addEventListener("offline", () => reportConnectivity(false));
  document.addEventListener("visibilitychange", check);
  navigator.connection?.addEventListener("change", check);
  setInterval(check, 15000);
  void check();
}
