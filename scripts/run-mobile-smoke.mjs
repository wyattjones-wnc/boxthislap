import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const previewUrl = "http://127.0.0.1:4173";
const viteCli = path.join(
  projectRoot,
  "node_modules",
  "vite",
  "bin",
  "vite.js",
);
const playwrightCli = path.join(
  projectRoot,
  "node_modules",
  "@playwright",
  "test",
  "cli.js",
);
const previewServer = spawn(
  process.execPath,
  [viteCli, "preview", "--host", "127.0.0.1", "--strictPort"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
  },
);

let tests;

try {
  await waitForPreview();
  tests = spawn(process.execPath, [playwrightCli, "test"], {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
  });

  const testExitCode = await waitForExit(tests);
  process.exitCode = testExitCode ?? 1;
} finally {
  stopProcessTree(previewServer);
}

process.exit(process.exitCode ?? 1);

async function waitForPreview() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (previewServer.exitCode !== null) {
      throw new Error(
        `Vite preview exited before becoming ready (${previewServer.exitCode}).`,
      );
    }

    try {
      const response = await fetch(previewUrl);

      if (response.ok) {
        return;
      }
    } catch {
      // The server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Vite preview did not become ready at ${previewUrl}.`);
}

/**
 * @param {import("node:child_process").ChildProcess} childProcess
 * @returns {Promise<number | null>}
 */
function waitForExit(childProcess) {
  return new Promise((resolve, reject) => {
    childProcess.once("error", reject);
    childProcess.once("exit", (exitCode) => resolve(exitCode));
  });
}

/** @param {import("node:child_process").ChildProcess} childProcess */
function stopProcessTree(childProcess) {
  if (!childProcess.pid || childProcess.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/PID", String(childProcess.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  childProcess.kill("SIGTERM");
}
