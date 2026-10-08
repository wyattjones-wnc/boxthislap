import { IMAGE_LIBRARY_ENDPOINT } from "../../../modules/siteConfig";
import type { CropPreset, EditorOptions } from "./ImageEditor";
export type SharedContent = {
  id: string;
  kind: string;
  title: string;
  year: string;
  external_key?: string;
};
export type ImageFile = {
  id: string;
  content_id: string;
  path: string;
  width: number;
  height: number;
  byte_size: number;
  location: string;
  bucket?: string;
};
export type ImageMatch = {
  id: string;
  kind: string;
  candidates: SharedContent[];
  files: ImageFile[];
  linked: boolean;
};
export type ImageExport = {
  blob: Blob;
  width: number;
  height: number;
  preset?: CropPreset;
};
export type ImageEditorRequest = EditorOptions & { context?: string };
export type RankingImagesRequest = {
  kind: string;
  itemId: string;
  title: string;
  bundledPaths?: string[];
};
declare global {
  interface Window {
    boxThisLapOpenImageEditor?: (
      request: ImageEditorRequest,
    ) => Promise<ImageExport | null>;
  }
}
export async function imageApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!window.boxThisLapGetManagerAccessToken) {
    await new Promise<void>((resolve) => {
      const ready = () => {
        clearTimeout(timer);
        window.removeEventListener("boxthislap:manager-auth-ready", ready);
        resolve();
      };
      const timer = window.setTimeout(ready, 10000);
      window.addEventListener("boxthislap:manager-auth-ready", ready, {
        once: true,
      });
      if (window.boxThisLapGetManagerAccessToken) ready();
    });
    if (!window.boxThisLapGetManagerAccessToken)
      throw new Error(
        "Sign-in controls are still loading. Retry the connection shortly.",
      );
  }
  const token = await window.boxThisLapGetManagerAccessToken();
  if (!token) throw new Error("Sign in again to access the image library.");
  let response: Response;
  try {
    response = await fetch(`${IMAGE_LIBRARY_ENDPOINT}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
      },
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError")
      throw new Error(
        "The cloud image service timed out. Try reconnecting. Local editing remains available.",
      );
    throw new Error(
      "Cloud image features are not connected. Check cloud setup or your connection, then retry. Local editing remains available.",
    );
  }
  const value = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      value.error ||
        "The image library is unavailable. Local editing remains available.",
    );
  return value as T;
}
export function imageUrl(file: ImageFile) {
  return file.location === "bundled" || /^https:\/\//.test(file.path)
    ? file.path
    : `${IMAGE_LIBRARY_ENDPOINT}${file.path}`;
}
export async function uploadFinished(
  contentId: string,
  blob: Blob,
  preset?: CropPreset,
) {
  const form = new FormData();
  form.set("contentId", contentId);
  form.set("file", blob, `image.${blob.type.split("/")[1] || "webp"}`);
  if (preset) {
    form.set("presetId", preset.id);
    form.set("presetVersion", String(preset.version));
  }
  return imageApi<{ file: ImageFile }>("/api/images/files", {
    method: "POST",
    body: form,
  });
}
export function notifyImagesChanged() {
  window.dispatchEvent(new Event("boxthislap:images-changed"));
}
