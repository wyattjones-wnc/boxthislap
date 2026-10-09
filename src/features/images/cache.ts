const approved = new Set([
  "https://box-this-lap-footy-notes.boxthislap.workers.dev",
  "https://box-this-lap-image-library.boxthislap.workers.dev",
]);
/** Repair at most once per element; never loop on a missing image or a budget cutoff. */
export function installImageCacheRepair() {
  const tried = new WeakSet<HTMLImageElement>();
  document.addEventListener(
    "error",
    (event) => {
      const img = event.target;
      if (
        !(img instanceof HTMLImageElement) ||
        tried.has(img) ||
        !navigator.serviceWorker?.controller ||
        !img.src
      )
        return;
      const url = new URL(img.src);
      if (
        url.origin !== location.origin &&
        (!approved.has(url.origin) || !/^\/media\//.test(url.pathname))
      )
        return;
      tried.add(img);
      const channel = new MessageChannel(),
        source = img.src;
      const timeout = setTimeout(() => {
        channel.port1.close();
        channel.port2.close();
      }, 5000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        channel.port1.close();
        if (event.data?.ok && img.src === source && img.isConnected) {
          url.searchParams.set("__image_retry", String(Date.now()));
          img.src = url.href;
        }
      };
      navigator.serviceWorker.controller.postMessage(
        { type: "INVALIDATE_IMAGE", url: source },
        [channel.port2],
      );
    },
    true,
  );
}
