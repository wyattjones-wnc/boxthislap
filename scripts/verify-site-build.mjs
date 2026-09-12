import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputDirectory = path.join(projectRoot, "dist");
const buildDirectory = path.join(outputDirectory, "build");
const indexHtml = await readFile(
  path.join(outputDirectory, "index.html"),
  "utf8",
);
const mainScriptMatch = indexHtml.match(/\.\/build\/(index-[^"']+\.js)/);

if (!mainScriptMatch) {
  throw new Error(
    "The production page does not reference a hashed main script.",
  );
}

const mainScript = await readFile(
  path.join(buildDirectory, mainScriptMatch[1]),
);
const mainScriptBytes = mainScript.byteLength;
const mainScriptGzipBytes = gzipSync(mainScript).byteLength;
const maximumMainScriptBytes = 465_000;
const maximumMainScriptGzipBytes = 128_000;

if (mainScriptBytes > maximumMainScriptBytes) {
  throw new Error(
    `Main script is ${mainScriptBytes} bytes; the mobile budget is ${maximumMainScriptBytes} bytes.`,
  );
}

if (mainScriptGzipBytes > maximumMainScriptGzipBytes) {
  throw new Error(
    `Main script is ${mainScriptGzipBytes} gzip bytes; the mobile budget is ${maximumMainScriptGzipBytes} bytes.`,
  );
}

const buildFiles = await readdir(buildDirectory);
const expectedLazyChunks = [
  "collectibles-",
  "draftLists-",
  "formulaOneQualifying-",
  "guides-",
  "platinums-",
  "trophyLog-",
  "trophyStats-",
  "youtubeInbox-",
];
const missingLazyChunks = expectedLazyChunks.filter(
  (prefix) =>
    !buildFiles.some((file) => file.startsWith(prefix) && file.endsWith(".js")),
);

if (missingLazyChunks.length) {
  throw new Error(
    `Missing route-level chunks: ${missingLazyChunks.join(", ")}`,
  );
}

console.info(
  `Verified mobile bundle: ${mainScriptBytes} bytes (${mainScriptGzipBytes} gzip bytes) with ${expectedLazyChunks.length} lazy chunks.`,
);
