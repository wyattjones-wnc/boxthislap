import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const RANKING_ASSET_DIR = path.join(ROOT_DIR, "assets", "ranking");
const OUTPUT_PATH = path.join(ROOT_DIR, "data", "ranking-assets.json");

const manifest = {};

async function readDirectorySafe(directory) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function buildManifest() {
  const categoryEntries = await readDirectorySafe(RANKING_ASSET_DIR);

  for (const categoryEntry of categoryEntries) {
    if (!categoryEntry.isDirectory()) {
      continue;
    }

    const category = categoryEntry.name;
    const categoryDirectory = path.join(RANKING_ASSET_DIR, category);
    const itemEntries = await readDirectorySafe(categoryDirectory);
    const categoryManifest = {};

    for (const itemEntry of itemEntries) {
      if (!itemEntry.isDirectory()) {
        continue;
      }

      const itemId = itemEntry.name;
      const itemDirectory = path.join(categoryDirectory, itemId);
      const imageEntries = await readDirectorySafe(itemDirectory);
      const imagePaths = imageEntries
        .filter((imageEntry) => imageEntry.isFile() && imageEntry.name.toLowerCase().endsWith(".webp"))
        .map((imageEntry) => path.posix.join("assets", "ranking", category, itemId, imageEntry.name))
        .sort((first, second) => first.localeCompare(second, undefined, { numeric: true }));

      if (imagePaths.length > 0) {
        categoryManifest[itemId] = imagePaths;
      }
    }

    if (Object.keys(categoryManifest).length > 0) {
      manifest[category] = categoryManifest;
    }
  }
}

await buildManifest();
await writeFile(`${OUTPUT_PATH}`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
