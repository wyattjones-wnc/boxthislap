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

const staticPageContent = [
  ...indexHtml.matchAll(
    /<section\b[^>]*\bdata-page=["'][^"']+["'][^>]*>([\s\S]*?)<\/section>/g,
  ),
].filter((match) => match[1].trim());

if (staticPageContent.length) {
  throw new Error(
    "Production page roots must be empty so React remains their only structural owner.",
  );
}

for (const shellElement of ["header", "footer"]) {
  const shellContent = indexHtml.match(
    new RegExp(`<${shellElement}\\b[^>]*>([\\s\\S]*?)<\\/${shellElement}>`),
  )?.[1];
  if (shellContent?.trim()) {
    throw new Error(
      `Production ${shellElement} root must be empty so React remains its only structural owner.`,
    );
  }
}

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
const maximumMainScriptBytes = 475_000;
const maximumMainScriptGzipBytes = 132_000;

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

if (!indexHtml.includes('href="manifest.webmanifest?')) {
  throw new Error(
    "The production page does not reference the root app manifest.",
  );
}

if (buildFiles.some((file) => file.endsWith(".webmanifest"))) {
  throw new Error(
    "The app manifest was bundled into the build directory, which changes its relative start URL.",
  );
}

const expectedLazyChunks = [
  "collectibles-",
  "draftLists-",
  "formDialog-",
  "formulaOneQualifying-",
  "followedTeamsDialog-",
  "guideData-",
  "nextItemDialog-",
  "platinums-",
  "todoItemDialog-",
  "trophyLog-",
  "trophyStats-",
  "wantItemDialog-",
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
