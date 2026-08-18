import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS_DIR = path.join(ROOT_DIR, "assets");
const OUTPUT_PATH = path.join(ASSETS_DIR, "image-cache-manifest.json");
const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

const images = [];

async function visit(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await visit(absolutePath);
      continue;
    }

    if (!IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    const fileStats = await stat(absolutePath);
    images.push({
      bytes: fileStats.size,
      path: path.relative(ROOT_DIR, absolutePath).replaceAll("\\", "/"),
    });
  }
}

await visit(ASSETS_DIR);
images.sort((first, second) => first.path.localeCompare(second.path));

await writeFile(OUTPUT_PATH, `${JSON.stringify({ images }, null, 2)}\n`, "utf8");
console.log(`Wrote ${images.length} images to ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
