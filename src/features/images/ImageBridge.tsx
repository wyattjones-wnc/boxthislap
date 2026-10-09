import { createPortal } from "react-dom";
import { useAppState } from "../../app/providers";
import { lazy, Suspense, useEffect, useState } from "react";
import type { ImageEditorRequest, ImageExport } from "./api";
const ImageDialogs = lazy(() => import("./ImageDialogs"));
/** Keep only the event bridge loaded until an integrated editor is requested. */
const ImageFeature = lazy(() => import("./ImageFeature"));
export default function ImageBridge({ root }: { root?: Element }) {
  const { route } = useAppState();
  const [opened, setOpened] = useState(route === "image-editor");
  useEffect(() => {
    if (route === "image-editor") setOpened(true);
  }, [route]);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<CustomEvent | null>(null);
  useEffect(() => {
    window.boxThisLapOpenImageEditor = (request: ImageEditorRequest) =>
      new Promise<ImageExport | null>((resolve) => {
        window.dispatchEvent(
          new CustomEvent("boxthislap:open-image-editor", {
            detail: { ...request, resolve },
          }),
        );
      });
    const receive = (event: Event) => {
      if (!ready) {
        setPending(event as CustomEvent);
        setReady(true);
      }
    };
    window.addEventListener("boxthislap:open-image-editor", receive);
    window.addEventListener("boxthislap:ranking-images", receive);
    return () => {
      window.removeEventListener("boxthislap:open-image-editor", receive);
      window.removeEventListener("boxthislap:ranking-images", receive);
      delete window.boxThisLapOpenImageEditor;
    };
  }, [ready]);
  if (!ready && !opened) return null;
  return (
    <Suspense fallback={<p role="status">Loading image tools…</p>}>
      {ready && <ImageDialogs />}
      {opened && root && createPortal(<ImageFeature />, root)}
      <Replay event={pending} done={() => setPending(null)} />
    </Suspense>
  );
}
function Replay({
  event,
  done,
}: {
  event: CustomEvent | null;
  done: () => void;
}) {
  useEffect(() => {
    if (event) {
      window.dispatchEvent(
        new CustomEvent(event.type, { detail: event.detail }),
      );
      done();
    }
  }, [event, done]);
  return null;
}
