import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contextDirectory = join(root, ".agents");
const requiredTopics = [
  "overview.md",
  "guides.md",
  "footy.md",
  "rankings.md",
  "manager-hub.md",
  "google-sheets.md",
  "fantasy-leagues.md",
  "formula-1.md",
  "scriptable.md",
];
const errors = [];
const warnings = [];

const files = [join(root, "AGENTS.md")];
for (const topic of requiredTopics) files.push(join(contextDirectory, topic));

for (const file of files) {
  if (!existsSync(file)) {
    errors.push(`Missing required context file: ${relative(root, file)}`);
    continue;
  }

  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/).length;
  const limit = file.endsWith("overview.md") ? 120 : 140;
  if (lines > limit) {
    warnings.push(
      `${relative(root, file)} has ${lines} lines (recommended maximum: ${limit}).`,
    );
  }

  const markdownLinks = text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g);
  for (const match of markdownLinks) {
    const target = match[1].trim().replace(/^<|>$/g, "").split("#", 1)[0];
    if (!target || /^(?:https?:|mailto:|codex:)/i.test(target)) continue;
    const resolved = resolve(dirname(file), decodeURIComponent(target));
    if (!existsSync(resolved)) {
      errors.push(`${relative(root, file)} links to missing path: ${target}`);
    }
  }
}

if (existsSync(contextDirectory)) {
  const unexpected = readdirSync(contextDirectory).filter(
    (name) => extname(name) === ".md" && !requiredTopics.includes(name),
  );
  if (unexpected.length) {
    warnings.push(`Unrouted context files: ${unexpected.join(", ")}`);
  }
}

const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);
for (const file of files.filter(existsSync)) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/`npm run ([\w:-]+)/g)) {
    if (!packageJson.scripts?.[match[1]]) {
      errors.push(
        `${relative(root, file)} references missing npm script: ${match[1]}`,
      );
    }
  }

  for (const match of text.matchAll(/`([^`\r\n]+)`/g)) {
    for (const rawToken of match[1].split(/\s+/)) {
      const token = rawToken.replace(/^["']|["',;:]$/g, "").replace(/\\/g, "/");
      if (!/^(?:[\w.-]+\/)+[\w.*-]+\.[\w.*-]+$/.test(token)) continue;

      const wildcardIndex = token.search(/[?*]/);
      const checkPath =
        wildcardIndex < 0
          ? token
          : token.slice(0, token.lastIndexOf("/", wildcardIndex));
      if (!existsSync(resolve(root, checkPath))) {
        errors.push(
          `${relative(root, file)} command references missing path: ${token}`,
        );
      }
    }
  }
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
for (const error of errors) console.error(`error: ${error}`);

if (errors.length) process.exitCode = 1;
else {
  const totalBytes = files
    .filter(existsSync)
    .reduce((sum, file) => sum + statSync(file).size, 0);
  console.log(
    `Agent context is valid: ${files.length} files, ${totalBytes} bytes, ${warnings.length} warning(s).`,
  );
}
