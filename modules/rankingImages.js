import { IMAGE_LIBRARY_ENDPOINT } from "./siteConfig.js";
const resolved = new Map();
let generation = 0;
const normalize = (value) =>
  String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
export function clearSharedRankingImages() {
  resolved.clear();
  generation++;
}
export function sharedRankingImages(managerId, kind, item, bundled, mcuRows) {
  const entry = resolved.get(`${managerId}:${kind}:${item.id}`);
  let paths =
    kind === "games" && String(managerId) !== "6"
      ? []
      : bundled?.[kind]?.[String(item.id)] || [];
  // Existing bundled MCU images can also serve an unambiguous matching movie title.
  if (kind === "movies") {
    const matches = mcuRows.filter(
      (row) => normalize(row.name) === normalize(item.name),
    );
    if (matches.length === 1)
      paths = [...paths, ...(bundled?.mcu?.[String(matches[0].id)] || [])];
  }
  return [
    ...new Set([
      ...paths,
      ...(entry?.files || []).map((f) =>
        f.location === "bundled"
          ? f.path
          : `${IMAGE_LIBRARY_ENDPOINT}${f.path}`,
      ),
    ]),
  ];
}
export async function loadSharedRankingImages(managerId, kind, items) {
  const pending = items.filter((i) => {
    const entry = resolved.get(`${managerId}:${kind}:${i.id}`);
    return !entry || entry.title !== i.name || Date.now() - entry.time > 300000;
  });
  if (!pending.length || !window.boxThisLapGetManagerAccessToken) return;
  const token = await window.boxThisLapGetManagerAccessToken();
  const started = generation;
  for (let offset = 0; offset < pending.length; offset += 40) {
    const batch = pending.slice(offset, offset + 40);
    try {
      const response = await fetch(
        `${IMAGE_LIBRARY_ENDPOINT}/api/images/resolve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: batch.map((i) => ({
              id: String(i.id),
              title: i.name,
              kind,
            })),
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!response.ok) throw new Error("Image library unavailable.");
      const value = await response.json();
      if (generation !== started) return;
      for (const match of value.matches)
        resolved.set(`${managerId}:${kind}:${match.id}`, {
          ...match,
          title: batch.find((i) => String(i.id) === match.id)?.name,
          time: Date.now(),
        });
    } catch {
      // Keep bundled images usable; avoid hammering an undeployed or unavailable API.
      if (generation === started)
        for (const i of batch)
          resolved.set(`${managerId}:${kind}:${i.id}`, {
            files: [],
            title: i.name,
            time: Date.now(),
          });
      return;
    }
  }
}
