import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const requested = process.argv.slice(2);
const files = requested.length
  ? requested.map((file) => resolve(process.cwd(), file))
  : readdirSync(scriptsDirectory)
      .filter((file) => file.endsWith(".gs"))
      .map((file) => join(scriptsDirectory, file));

let failures = 0;
for (const file of files) {
  try {
    new Script(readFileSync(file, "utf8"), { filename: file });
    console.log(`ok: ${basename(file)}`);
  } catch (error) {
    failures += 1;
    console.error(`error: ${file}`);
    console.error(error instanceof Error ? error.message : String(error));
  }
}

if (!files.length) {
  console.error("error: no Apps Script files found");
  process.exitCode = 1;
} else if (failures) {
  process.exitCode = 1;
}
