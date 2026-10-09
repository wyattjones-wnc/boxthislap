import { useEffect, useRef, useState } from "react";
import { ContainedDialog } from "../../components/ContainedDialog/ContainedDialog";
import { useAppState } from "../../app/providers";
import { ImageEditor, type CropPreset } from "./ImageEditor";
import { ImageLibrary } from "./ImageLibrary";
import {
  imageApi,
  imageUrl,
  type ImageFile,
  notifyImagesChanged,
  uploadFinished,
  type ImageEditorRequest,
  type ImageExport,
  type ImageMatch,
  type RankingImagesRequest,
  type SharedContent,
} from "./api";
import styles from "./Images.module.css";
export default function ImageDialogs() {
  const { session } = useAppState(),
    admin = Boolean(session?.isAdmin || session?.manager?.isAdmin);
  const resolutionVersion = useRef(0);
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [editingImage, setEditingImage] = useState<{
    image: ImageFile;
    file: File;
  } | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [editorVersion, setEditorVersion] = useState(0);
  const [pendingEdit, setPendingEdit] = useState<(() => void) | null>(null);
  const [presetsReady, setPresetsReady] = useState(false);
  const [request, setRequest] = useState<
    | (ImageEditorRequest & { resolve: (value: ImageExport | null) => void })
    | null
  >(null);
  const [ranking, setRanking] = useState<RankingImagesRequest | null>(null),
    [matches, setMatches] = useState<ImageMatch | null>(null);
  const [selected, setSelected] = useState<SharedContent | null>(null),
    [presets, setPresets] = useState<CropPreset[]>([]),
    [message, setMessage] = useState(""),
    [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false);
  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!admin) {
        detail.resolve(null);
        return;
      }
      setPresetsReady(false);
      setRequest(detail);
      setDirty(false);
    };
    const images = (event: Event) => {
      if (!session) return;
      const r = (event as CustomEvent<RankingImagesRequest>).detail;
      const version = ++resolutionVersion.current;
      setPresetsReady(false);
      setRanking(r);
      setEditingImage(null);
      setFiles([]);
      setDirty(false);
      setSelected(null);
      setMatches(null);
      setMessage("");
      void imageApi<{ matches: ImageMatch[] }>("/api/images/resolve", {
        method: "POST",
        body: JSON.stringify({
          items: [{ id: r.itemId, title: r.title, kind: r.kind }],
        }),
      })
        .then((v) => {
          if (version !== resolutionVersion.current) return;
          setMatches(v.matches[0]);
          if (v.matches[0]?.candidates.length === 1)
            setSelected(v.matches[0].candidates[0]);
        })
        .catch((e) => {
          if (version === resolutionVersion.current) setMessage(e.message);
        });
    };
    window.addEventListener("boxthislap:open-image-editor", open);
    window.addEventListener("boxthislap:ranking-images", images);
    return () => {
      window.removeEventListener("boxthislap:open-image-editor", open);
      window.removeEventListener("boxthislap:ranking-images", images);
    };
  }, [admin, session]);
  useEffect(() => {
    if (!request && !ranking) return;
    void imageApi<{ presets: CropPreset[] }>("/api/images/presets")
      .then((v) => {
        setPresets(v.presets);
        setPresetsReady(true);
      })
      .catch((e) => {
        setMessage(`${e.message} You can still edit locally.`);
        setPresetsReady(true);
      });
  }, [request, ranking]);
  useEffect(() => {
    if (!selected || !ranking) {
      setFiles([]);
      return;
    }
    let active = true;
    const load = () => {
      setGalleryLoading(true);
      void imageApi<{ files: ImageFile[] }>(
        `/api/images/content/${selected.id}`,
      )
        .then((v) => {
          if (active) {
            setGalleryLoading(false);
            setFiles(v.files);
            setGalleryError("");
          }
        })
        .catch((e) => {
          if (active) {
            setGalleryLoading(false);
            setGalleryError(e.message);
          }
        });
    };
    setFiles([]);
    load();
    window.addEventListener("boxthislap:images-changed", load);
    return () => {
      active = false;
      window.removeEventListener("boxthislap:images-changed", load);
    };
  }, [selected, ranking]);
  function changeEditor(action: () => void) {
    if (dirty) {
      setPendingEdit(() => action);
      setDiscard(true);
    } else action();
  }
  async function editImage(image: ImageFile) {
    setImageLoading(true);
    try {
      const response = await fetch(imageUrl(image));
      if (!response.ok)
        throw new Error(
          "This image could not be loaded for editing. Try again.",
        );
      const blob = await response.blob();
      if (blob.size > 5 * 1024 * 1024)
        throw new Error("This image exceeds the editor's 5 MB limit.");
      setEditingImage({
        image,
        file: new File([blob], "saved-image.webp", { type: blob.type }),
      });
      setEditorVersion((v) => v + 1);
      setDirty(false);
      setMessage(
        "Editing the saved image. Saving updates this shared title for all linked Ranking items. Saved images reopen as a single layer; use a local project file to preserve separate layers.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setImageLoading(false);
    }
  }
  function close() {
    resolutionVersion.current++;
    request?.resolve(null);
    setRequest(null);
    setRanking(null);
    setDirty(false);
    setDiscard(false);
    setPendingEdit(null);
    setEditingImage(null);
    setMessage("");
  }
  function tryClose() {
    if (dirty) setDiscard(true);
    else close();
  }
  async function link(content: SharedContent) {
    if (!ranking) return;
    try {
      await imageApi("/api/images/link", {
        method: "PUT",
        body: JSON.stringify({
          kind: ranking.kind,
          itemId: ranking.itemId,
          contentId: content.id,
        }),
      });
      setSelected(content);
      setEditingImage(null);
      setEditorVersion((v) => v + 1);
      setDirty(false);
      notifyImagesChanged();
      setMessage(`Linked to ${content.title}.`);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  if (!request && !ranking) return null;
  const context = request?.context || ranking?.kind;
  const allowed = presets.filter(
    (p) =>
      p.context === context || (context === "mcu" && p.context === "movies"),
  );
  const bundledPaths = [...new Set(ranking?.bundledPaths || [])].filter(
    (path) =>
      !files.some((file) => file.location === "bundled" && file.path === path),
  );
  const defaultPreset =
    (editingImage &&
      allowed.find(
        (p) =>
          p.id === editingImage.image.preset_id ||
          (p.width === editingImage.image.width &&
            p.height === editingImage.image.height),
      )) ||
    allowed.find((p) => p.is_default) ||
    allowed[0];
  return (
    <>
      <ContainedDialog
        title={ranking ? `Images for ${ranking.title}` : "Position image"}
        close={tryClose}
        bodyClassName={styles.dialogBody}
      >
        {request && !presetsReady ? (
          <p>Loading crop configuration…</p>
        ) : request ? (
          <ImageEditor
            {...request}
            width={defaultPreset?.width || request.width}
            height={defaultPreset?.height || request.height}
            initialPreset={defaultPreset}
            presets={allowed}
            onDirty={setDirty}
            onSave={async (blob, p, preset) => {
              request.resolve({
                blob,
                width: p.width,
                height: p.height,
                preset,
              });
              setRequest(null);
              setDirty(false);
            }}
          />
        ) : (
          <>
            {bundledPaths.length > 0 && (
              <section
                className={styles.section}
                aria-label="Bundled images for this item"
              >
                <h2>Bundled images ({bundledPaths.length})</h2>
                <p>
                  Included with the site and available in Compare. No cloud
                  upload is needed to view them.
                </p>
                <div className={styles.gallery}>
                  {bundledPaths.map((path, index) => (
                    <div key={path}>
                      <a href={path} target="_blank" rel="noreferrer">
                        <img
                          src={path}
                          alt={`${ranking?.title}, bundled image ${index + 1}`}
                          loading="lazy"
                        />
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {matches && matches.candidates.length > 1 && (
              <section>
                <p>Several shared titles match. Choose the correct one.</p>
                {matches.candidates.map((c) => (
                  <button key={c.id} type="button" onClick={() => void link(c)}>
                    {c.title}
                    {c.year ? ` (${c.year})` : ""}
                  </button>
                ))}
              </section>
            )}
            {admin && selected && Boolean(ranking?.bundledPaths?.length) && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    for (
                      let offset = 0;
                      offset < ranking!.bundledPaths!.length;
                      offset += 40
                    ) {
                      const files = [];
                      for (const path of ranking!.bundledPaths!.slice(
                        offset,
                        offset + 40,
                      )) {
                        const response = await fetch(path);
                        if (!response.ok)
                          throw new Error("Bundled image unavailable.");
                        const blob = await response.blob(),
                          bitmap = await createImageBitmap(blob);
                        files.push({
                          path,
                          width: bitmap.width,
                          height: bitmap.height,
                          byte_size: blob.size,
                        });
                        bitmap.close();
                      }
                      await imageApi("/api/images/bundled", {
                        method: "POST",
                        body: JSON.stringify({ contentId: selected.id, files }),
                      });
                    }
                    notifyImagesChanged();
                    setMessage(
                      "Existing bundled images linked to this shared title without uploading to R2.",
                    );
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                Share existing bundled images ({ranking?.bundledPaths?.length})
              </button>
            )}
            {selected && (
              <p>
                Shared content: {selected.title}
                {selected.year ? ` (${selected.year})` : ""}
              </p>
            )}
            {selected && (
              <section
                className={styles.section}
                aria-label="Images associated with this item"
              >
                <h2>Saved images ({files.length})</h2>
                <p>
                  These images are available in Compare and shared with other
                  items linked to {selected.title}.
                </p>
                {galleryError ? (
                  <p role="alert">{galleryError}</p>
                ) : galleryLoading && files.length === 0 ? (
                  <p>Loading saved images…</p>
                ) : files.length === 0 ? (
                  <p>No saved images are associated with this title yet.</p>
                ) : null}
                <div className={styles.gallery}>
                  {files.map((image, index) => (
                    <div key={image.id}>
                      <a
                        href={imageUrl(image)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={imageUrl(image)}
                          alt={`${selected.title}, image ${index + 1}`}
                          loading="lazy"
                        />
                      </a>
                      <small>
                        {image.width} × {image.height}
                      </small>
                      {admin &&
                        defaultPreset &&
                        (!image.bucket || image.bucket === "library") && (
                          <button
                            type="button"
                            disabled={imageLoading}
                            onClick={() =>
                              changeEditor(() => void editImage(image))
                            }
                          >
                            Edit image {index + 1}
                          </button>
                        )}
                    </div>
                  ))}
                </div>
                {admin && editingImage && (
                  <button
                    type="button"
                    onClick={() =>
                      changeEditor(() => {
                        setEditingImage(null);
                        setEditorVersion((v) => v + 1);
                        setDirty(false);
                        setMessage("");
                      })
                    }
                  >
                    Add another image
                  </button>
                )}
              </section>
            )}
            {admin && selected && defaultPreset && (
              <ImageEditor
                key={`${selected.id}-${editorVersion}`}
                file={editingImage?.file}
                saveLabel={
                  editingImage ? "Save image changes" : "Add image to item"
                }
                limited
                width={defaultPreset.width}
                height={defaultPreset.height}
                initialPreset={defaultPreset}
                presets={allowed}
                onDirty={setDirty}
                onSave={async (blob, _p, preset) => {
                  const result = await uploadFinished(
                    selected.id,
                    blob,
                    preset,
                    editingImage?.image.id,
                  );
                  setFiles((previous) => [
                    ...previous.filter(
                      (f) =>
                        f.id !== result.file.id &&
                        f.id !== editingImage?.image.id,
                    ),
                    { ...result.file, content_id: selected.id },
                  ]);
                  if (editingImage)
                    setEditingImage({ ...editingImage, image: result.file });
                  setMessage(
                    `${editingImage ? "Image changes saved" : "Image added"} for ${selected.title}. It is now available in Compare.`,
                  );
                  notifyImagesChanged();
                }}
              />
            )}
            {admin && selected && !defaultPreset && (
              <p>
                Configure a crop preset for this ranking type in{" "}
                <a href="#image-editor" data-page-link="image-editor">
                  Image Studio
                </a>{" "}
                before adding an image.
              </p>
            )}
            {admin && !selected && (
              <button
                type="button"
                onClick={async () => {
                  if (!ranking) return;
                  try {
                    const v = await imageApi<{ content: SharedContent }>(
                      "/api/images/content",
                      {
                        method: "POST",
                        body: JSON.stringify({
                          title: ranking.title,
                          kind: ranking.kind,
                          externalKey:
                            ranking.kind === "mcu"
                              ? `mcu:${ranking.itemId}`
                              : undefined,
                        }),
                      },
                    );
                    await link(v.content);
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                Create shared content for this item
              </button>
            )}
            <details>
              <summary>Choose or correct shared content</summary>
              <p>
                This chooser lists other shared titles. Their images are shown
                only after you link that title to this item.
              </p>
              <ImageLibrary
                showImages={false}
                selected={selected}
                onSelect={(c) => changeEditor(() => void link(c))}
                admin={admin}
              />
            </details>
            {selected && (
              <button
                type="button"
                onClick={async () => {
                  if (!ranking) return;
                  try {
                    await imageApi("/api/images/link", {
                      method: "DELETE",
                      body: JSON.stringify({
                        kind: ranking.kind,
                        itemId: ranking.itemId,
                      }),
                    });
                    setSelected(null);
                    notifyImagesChanged();
                    setMessage(
                      "Explicit link cleared. Automatic title matching applies again.",
                    );
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                Clear explicit link
              </button>
            )}
          </>
        )}
        <p role="status">{message}</p>
      </ContainedDialog>
      {discard && (
        <ContainedDialog
          title="Discard unsaved image changes?"
          close={() => {
            setDiscard(false);
            setPendingEdit(null);
          }}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setDiscard(false);
                  setPendingEdit(null);
                }}
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingEdit) {
                    pendingEdit();
                    setPendingEdit(null);
                    setDiscard(false);
                  } else close();
                }}
              >
                Discard changes
              </button>
            </>
          }
        >
          <p>Save a local layered project if you want to keep these edits.</p>
        </ContainedDialog>
      )}
    </>
  );
}
