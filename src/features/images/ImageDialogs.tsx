import { useEffect, useState } from "react";
import { ContainedDialog } from "../../components/ContainedDialog/ContainedDialog";
import { useAppState } from "../../app/providers";
import { ImageEditor, type CropPreset } from "./ImageEditor";
import { ImageLibrary } from "./ImageLibrary";
import {
  imageApi,
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
      setPresetsReady(false);
      setRanking(r);
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
          setMatches(v.matches[0]);
          if (v.matches[0]?.candidates.length === 1)
            setSelected(v.matches[0].candidates[0]);
        })
        .catch((e) => setMessage(e.message));
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
  function close() {
    request?.resolve(null);
    setRequest(null);
    setRanking(null);
    setDirty(false);
    setDiscard(false);
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
  const defaultPreset = allowed.find((p) => p.is_default) || allowed[0];
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
            {admin && selected && defaultPreset && (
              <ImageEditor
                key={selected.id}
                limited
                width={defaultPreset.width}
                height={defaultPreset.height}
                initialPreset={defaultPreset}
                presets={allowed}
                onDirty={setDirty}
                onSave={async (blob, _p, preset) => {
                  await uploadFinished(selected.id, blob, preset);
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
            <details open={!selected}>
              <summary>Choose or correct shared content</summary>
              <ImageLibrary
                selected={selected}
                onSelect={(c) => void link(c)}
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
          close={() => setDiscard(false)}
          footer={
            <>
              <button type="button" onClick={() => setDiscard(false)}>
                Keep editing
              </button>
              <button type="button" onClick={close}>
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
