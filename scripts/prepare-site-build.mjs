import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputDirectory = path.join(projectRoot, "dist");
const staticDirectories = ["assets", "data", "docs", "scriptable"];
const staticFiles = [
  "germany-paraguay.jpg",
  "manifest-dev.webmanifest",
  "manifest.webmanifest",
  "service-worker.js",
];

if (path.dirname(outputDirectory) !== projectRoot) {
  throw new Error(
    `Refusing to prepare unexpected output directory: ${outputDirectory}`,
  );
}

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });

await Promise.all([
  ...staticDirectories.map((directory) =>
    cp(
      path.join(projectRoot, directory),
      path.join(outputDirectory, directory),
      {
        recursive: true,
      },
    ),
  ),
  ...staticFiles.map((file) =>
    cp(path.join(projectRoot, file), path.join(outputDirectory, file)),
  ),
]);
