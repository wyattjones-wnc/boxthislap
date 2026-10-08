import { useEffect, useState } from "react";
import { useAppState } from "../../app/providers";
import { ImageEditor, type CropPreset } from "./ImageEditor";
import {
  imageApi,
  notifyImagesChanged,
  uploadFinished,
  type ImageFile,
  type SharedContent,
} from "./api";
import { CropSettings, ImageLibrary, UsageSettings } from "./ImageLibrary";
import { ContainedDialog } from "../../components/ContainedDialog/ContainedDialog";
import styles from "./Images.module.css";
export default function ImageFeature() {
  const { session } = useAppState();
  const [selected, setSelected] = useState<SharedContent | null>(null),
    [presets, setPresets] = useState<CropPreset[]>([]),
    [dirty, setDirty] = useState(false);
  const [unused, setUnused] = useState<ImageFile[]>([]),
    [deleting, setDeleting] = useState<ImageFile | null>(null),
    [message, setMessage] = useState("");
  const admin = Boolean(session?.isAdmin || session?.manager?.isAdmin);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  if (!admin) return <p>Sign in as an admin to open the image editor.</p>;
  return (
    <div className={styles.page}>
      <div>
        <a href="#the-monster-maniac" data-page-link="the-monster-maniac">
          Admin Home
        </a>
        <h1>Image Studio</h1>
        <p>
          Edit layered images and save projects locally. Choose shared content
          below when you want to upload a finished image.
        </p>
      </div>
      <p>
        {selected
          ? `Upload destination: ${selected.title}${selected.year ? ` (${selected.year})` : ""}`
          : "Local editing · no upload destination selected"}
      </p>
      <ImageEditor
        presets={presets.filter(
          (p) =>
            p.context === "standalone" ||
            p.context === selected?.kind ||
            (selected?.kind === "movies" && p.context === "mcu"),
        )}
        onDirty={setDirty}
        onSave={
          selected
            ? async (blob, _project, preset) => {
                await uploadFinished(selected.id, blob, preset);
                notifyImagesChanged();
              }
            : undefined
        }
      />
      <details>
        <summary>Shared image library</summary>
        <ImageLibrary selected={selected} onSelect={setSelected} />
      </details>
      <details>
        <summary>Crop presets</summary>
        <CropSettings onChange={setPresets} />
      </details>
      <details>
        <summary>Cloud usage and hard stops</summary>
        <UsageSettings />
      </details>
      <details>
        <summary>Unused uploaded files</summary>
        <p>
          Removing an association does not delete its file. Delete unused files
          here to reclaim storage.
        </p>
        <button
          type="button"
          onClick={() =>
            void imageApi<{ files: ImageFile[] }>("/api/images/files")
              .then((v) => setUnused(v.files))
              .catch((e) => setMessage(e.message))
          }
        >
          Load unused files
        </button>
        {unused.map((f) => (
          <div key={f.id}>
            {f.width} × {f.height} · {Math.ceil(f.byte_size / 1000)} KB{" "}
            <button type="button" onClick={() => setDeleting(f)}>
              Delete permanently
            </button>
          </div>
        ))}
      </details>
      <p role="status">{message}</p>
      {deleting && (
        <ContainedDialog
          title="Delete unused image"
          close={() => setDeleting(null)}
          footer={
            <>
              <button type="button" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  void imageApi(
                    `/api/images/files/${encodeURIComponent(deleting.id)}`,
                    {
                      method: "DELETE",
                    },
                  )
                    .then(() => {
                      setUnused(unused.filter((f) => f.id !== deleting.id));
                      setDeleting(null);
                      notifyImagesChanged();
                    })
                    .catch((e) => setMessage(e.message))
                }
              >
                Delete permanently
              </button>
            </>
          }
        >
          <p>
            This deletes the unused cloud file. Local project files are
            unaffected.
          </p>
        </ContainedDialog>
      )}
    </div>
  );
}
