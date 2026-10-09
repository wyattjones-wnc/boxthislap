import { useEffect, useState } from "react";
import { FloatingField } from "../../components/FloatingField/FloatingField";
import { ContainedDialog } from "../../components/ContainedDialog/ContainedDialog";
import {
  imageApi,
  imageUrl,
  notifyImagesChanged,
  type ImageFile,
  type SharedContent,
} from "./api";
import type { CropPreset } from "./ImageEditor";
import styles from "./Images.module.css";
export function ImageLibrary({
  selected,
  onSelect,
  admin = true,
  showImages = true,
}: {
  selected: SharedContent | null;
  onSelect: (content: SharedContent) => void;
  admin?: boolean;
  showImages?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [content, setContent] = useState<SharedContent[]>([]),
    [files, setFiles] = useState<ImageFile[]>([]);
  const [title, setTitle] = useState(""),
    [kind, setKind] = useState("movies"),
    [year, setYear] = useState(""),
    [aliases, setAliases] = useState("");
  const [editing, setEditing] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [remove, setRemove] = useState<{
    file: ImageFile;
    contentId: string;
  } | null>(null);
  async function load() {
    setBusy(true);
    try {
      const value = await imageApi<{
        content: SharedContent[];
        files: ImageFile[];
      }>(`/api/images/catalog?q=${encodeURIComponent(query)}`);
      setConnected(true);
      setContent(value.content);
      setFiles(value.files);
      setMessage("");
    } catch (e) {
      setConnected(false);
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
    window.addEventListener("boxthislap:images-changed", load);
    return () => window.removeEventListener("boxthislap:images-changed", load);
  }, []);
  async function save() {
    setBusy(true);
    try {
      const body = JSON.stringify({
        title,
        kind,
        year,
        aliases: aliases
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      if (editing && selected)
        await imageApi(`/api/images/content/${selected.id}`, {
          method: "PUT",
          body,
        });
      else {
        const value = await imageApi<{ content: SharedContent }>(
          "/api/images/content",
          { method: "POST", body },
        );
        onSelect(value.content);
      }
      setEditing(false);
      setTitle("");
      setAliases("");
      notifyImagesChanged();
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.section} aria-label="Shared image library">
      <h2>Shared image library</h2>
      <p>
        Choose content to associate with finished images. Matching ranking
        titles can use these images across managers.
      </p>
      <form
        className={styles.toolbar}
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <FloatingField label="Search titles">
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </FloatingField>
        <button type="submit" disabled={busy}>
          {connected ? "Search" : "Retry connection"}
        </button>
      </form>
      <div className={styles.grid}>
        {content.map((c) => (
          <div key={c.id} className={styles.section}>
            <button
              type="button"
              aria-pressed={selected?.id === c.id}
              onClick={() => onSelect(c)}
            >
              {c.title}
              {c.year ? ` (${c.year})` : ""} · {c.kind}
            </button>
            {admin && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onSelect(c);
                  setTitle(c.title);
                  setKind(c.kind);
                  setYear(c.year);
                  setAliases("");
                  setEditing(true);
                  setMessage(
                    "Saving alternate titles replaces the current alternate title list.",
                  );
                  void imageApi<{ aliases: string[] }>(
                    `/api/images/content/${c.id}`,
                  )
                    .then((v) =>
                      setAliases(
                        v.aliases
                          .filter((a) => a !== c.title.trim().toLowerCase())
                          .join("\n"),
                      ),
                    )
                    .catch((e) => setMessage(e.message));
                }}
              >
                Edit title / aliases
              </button>
            )}
            {showImages && (
              <div className={styles.gallery}>
                {files
                  .filter((f) => f.content_id === c.id)
                  .map((f) => (
                    <div key={f.id}>
                      <img
                        src={imageUrl(f)}
                        alt={`${c.title} (${f.width} × ${f.height})`}
                        loading="lazy"
                      />
                      <small>
                        {f.width} × {f.height} · {Math.ceil(f.byte_size / 1000)}{" "}
                        KB
                      </small>
                      {admin && (!f.bucket || f.bucket === "library") && (
                        <button
                          type="button"
                          onClick={() =>
                            setRemove({ file: f, contentId: c.id })
                          }
                        >
                          Remove image
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {admin && (
        <form
          className={styles.grid}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <FloatingField label="Title">
            <input
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FloatingField>
          <FloatingField label="Content type">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="movies">Movies / MCU</option>
              <option value="games">Games</option>
              <option value="tv">TV</option>
              <option value="footy">Footy</option>
            </select>
          </FloatingField>
          <FloatingField label="Release year (optional)">
            <input
              value={year}
              pattern="[0-9]{4}"
              maxLength={4}
              onChange={(e) => setYear(e.target.value)}
            />
          </FloatingField>
          <FloatingField label="Alternate titles (one per line)">
            <textarea
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
            />
          </FloatingField>
          <button type="submit" disabled={busy || !connected}>
            {editing ? "Save content details" : "Create shared content"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setTitle("");
                setAliases("");
              }}
            >
              Cancel edit
            </button>
          )}
        </form>
      )}
      <p role="status">{message}</p>
      {remove && (
        <ContainedDialog
          title="Remove shared image"
          close={() => {
            if (!busy) setRemove(null);
          }}
          footer={
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setRemove(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await imageApi("/api/images/associations", {
                      method: "DELETE",
                      body: JSON.stringify({
                        contentId: remove.contentId,
                        fileId: remove.file.id,
                      }),
                    });
                    notifyImagesChanged();
                    setRemove(null);
                    await load();
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Remove association
              </button>
            </>
          }
        >
          <p>
            This removes the image from this shared title for every manager. The
            file remains available until it is deleted as an unused file.
          </p>
        </ContainedDialog>
      )}
    </section>
  );
}
export function CropSettings({
  onChange,
}: {
  onChange: (presets: CropPreset[]) => void;
}) {
  const [presets, setPresets] = useState<CropPreset[]>([]),
    [editing, setEditing] = useState<CropPreset | null>(null);
  const [name, setName] = useState(""),
    [context, setContext] = useState("movies"),
    [width, setWidth] = useState(""),
    [height, setHeight] = useState(""),
    [isDefault, setDefault] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  async function load() {
    try {
      const value = await imageApi<{ presets: CropPreset[] }>(
        "/api/images/presets",
      );
      setConnected(true);
      setMessage("");
      setPresets(value.presets);
      onChange(value.presets);
    } catch (e) {
      setConnected(false);
      setMessage((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className={styles.section}>
      <h2>Crop presets</h2>
      <p>
        Preset changes apply to future exports. Existing images keep their saved
        dimensions.
      </p>
      {!connected && message && (
        <button type="button" onClick={() => void load()}>
          Retry connection
        </button>
      )}
      <div className={styles.grid}>
        {presets.map((p) => (
          <div key={p.id}>
            <strong>{p.name}</strong> · {p.context} · {p.width} × {p.height}
            {p.is_default ? " · Default" : ""}
            <button
              type="button"
              onClick={() => {
                setEditing(p);
                setName(p.name);
                setContext(p.context);
                setWidth(String(p.width));
                setHeight(String(p.height));
                setDefault(Boolean(p.is_default));
              }}
            >
              Edit
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await imageApi(`/api/images/presets/${p.id}`, {
                    method: "DELETE",
                  });
                  await load();
                } catch (e) {
                  setMessage((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete preset
            </button>
          </div>
        ))}
      </div>
      <form
        className={styles.grid}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await imageApi("/api/images/presets", {
              method: "PUT",
              body: JSON.stringify({
                id: editing?.id,
                version: editing?.version,
                name,
                context,
                width: Number(width),
                height: Number(height),
                is_default: isDefault,
              }),
            });
            setEditing(null);
            setName("");
            setWidth("");
            setHeight("");
            setDefault(false);
            await load();
            setMessage("Preset saved.");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <FloatingField label="Preset name">
          <input
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FloatingField>
        <FloatingField label="Context">
          <select value={context} onChange={(e) => setContext(e.target.value)}>
            {[
              "movies",
              "mcu",
              "games",
              "tv",
              "footy-card",
              "footy-profile",
              "standalone",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </FloatingField>
        <FloatingField label="Width (pixels)">
          <input
            required
            type="number"
            min="1"
            max="8192"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          />
        </FloatingField>
        <FloatingField label="Height (pixels)">
          <input
            required
            type="number"
            min="1"
            max="8192"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </FloatingField>
        <label>
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setDefault(e.target.checked)}
          />{" "}
          Default for this context
        </label>
        <button type="submit" disabled={busy || !connected}>
          {editing ? "Update preset" : "Add preset"}
        </button>
      </form>
      <p role="status">{message}</p>
    </section>
  );
}
type Budget = {
  config: {
    enabled: boolean;
    initialized: boolean;
    billingDay: number;
    storageLimit: number;
    readLimit: number;
    writeLimit: number;
    dailyLimit: number;
  };
  storage: number;
  reads: number;
  writes: number;
  daily: number;
  period: string;
  day: string;
};
export function UsageSettings() {
  const [budget, setBudget] = useState<Budget | null>(null),
    [config, setConfig] = useState<Budget["config"] | null>(null),
    [baseline, setBaseline] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const v = await imageApi<Budget>("/api/images/budget");
      setBudget(v);
      setConfig(v.config);
      setMessage("");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className={styles.section}>
      <h2>Cloud image safety limits</h2>
      <p>
        These limits cover managed roster, match, and library R2 operations.
        Existing cached images remain usable when cloud access is stopped.
        Unrelated Cloudflare services and direct bucket access are outside this
        gate.
      </p>
      {!budget && message && (
        <button type="button" onClick={() => void load()}>
          Retry connection
        </button>
      )}
      {budget && (
        <p>
          {Math.ceil(budget.storage / 1e6)} MB reserved storage · {budget.reads}{" "}
          reads · {budget.writes} writes/listings this billing period ·{" "}
          {budget.daily} operations today. Failed attempts retain their
          reservations.
        </p>
      )}
      {config && (
        <form
          className={styles.grid}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const value = await imageApi<Budget>("/api/images/budget", {
                method: "PUT",
                body: JSON.stringify({
                  ...config,
                  baselineBytes: Number(baseline),
                }),
              });
              setBudget(value);
              setConfig(value.config);
              setMessage("Safety limits saved.");
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) =>
                setConfig({ ...config, enabled: e.target.checked })
              }
            />{" "}
            Allow cloud image operations
          </label>
          {!config.initialized && (
            <>
              <p>
                Before enabling, account for existing storage across all managed
                buckets and review account headroom. No automatic bucket scan is
                performed.
              </p>
              <FloatingField label="Existing managed storage (bytes)">
                <input
                  required
                  type="number"
                  min="0"
                  value={baseline}
                  onChange={(e) => setBaseline(e.target.value)}
                />
              </FloatingField>
            </>
          )}
          {(
            [
              "billingDay",
              "storageLimit",
              "readLimit",
              "writeLimit",
              "dailyLimit",
            ] as const
          ).map((key) => (
            <FloatingField
              key={key}
              label={
                {
                  billingDay: "Billing cycle start day (1–28)",
                  storageLimit: "Storage ceiling (bytes)",
                  readLimit: "Reads per billing period",
                  writeLimit: "Writes/listings per billing period",
                  dailyLimit: "Operations per day",
                }[key]
              }
            >
              <input
                type="number"
                required
                min="1"
                disabled={key === "billingDay" && config.initialized}
                value={config[key]}
                onChange={(e) =>
                  setConfig({ ...config, [key]: Number(e.target.value) })
                }
              />
            </FloatingField>
          ))}
          <button type="submit" disabled={busy}>
            Save safety limits
          </button>
        </form>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
