import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = path.join(ROOT_DIR, "index.html");

const now = new Date();
const version = [
  now.getUTCFullYear(),
  String(now.getUTCMonth() + 1).padStart(2, "0"),
  String(now.getUTCDate()).padStart(2, "0"),
  String(now.getUTCHours()).padStart(2, "0"),
  String(now.getUTCMinutes()).padStart(2, "0"),
].join(".");
const cacheVersion = version.replaceAll(".", "");

let html = await readFile(INDEX_PATH, "utf8");

html = html
  .replace(/window\.BOX_THIS_LAP_VERSION = "[^"]+";/, `window.BOX_THIS_LAP_VERSION = "${version}";`)
  .replace(/styles\.css\?v=\d+/g, `styles.css?v=${cacheVersion}`)
  .replace(/script\.js\?v=\d+/g, `script.js?v=${cacheVersion}`);

await writeFile(INDEX_PATH, html, "utf8");
console.log(`Bumped site version to ${version}`);
