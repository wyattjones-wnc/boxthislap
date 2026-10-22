import { setTimeout as delay } from "node:timers/promises";
// Manual bootstrap uses the same bounded/restartable job as the nightly Worker cron.
// Credentials are injected only into this GitHub Actions process, never written to disk.
import { refreshMovieResource } from "../workers/league-drafts/src/movie-resource.js";
import { saveState } from "../workers/league-drafts/src/index.js";

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const database = "b3e28ed0-a9c9-43d1-a6cb-ae22b8a181a6";
if (!account || !token) throw new Error("Cloudflare credentials are required.");
const usage = { d1Requests: 0, rowsRead: 0, rowsWritten: 0, tmdbRequests: 0 };
const DB = {
  prepare(sql) {
    return {
      bind(...params) {
        const execute = async () => {
          const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ sql, params }),
              signal: AbortSignal.timeout(30_000),
            },
          );
          if (!response.ok)
            throw new Error(
              `Cloudflare D1 request failed (${response.status}).`,
            );
          const body = await response.json();
          if (!body.success || !body.result?.[0]?.success)
            throw new Error(
              "Cloudflare D1 could not apply the movie resource batch.",
            );
          usage.d1Requests += 1;
          usage.rowsRead += Number(body.result[0].meta?.rows_read || 0);
          usage.rowsWritten += Number(body.result[0].meta?.rows_written || 0);
          return body.result[0];
        };
        return {
          run: execute,
          all: execute,
          async first() {
            return (await execute()).results[0] || null;
          },
        };
      },
    };
  },
};
const env = {
  ...process.env,
  DB,
  DRAFT_ENVIRONMENT: "dev",
  TMDB_CATALOG_ENABLED: "true",
};
try {
  for (let batch = 0; batch < 600; batch += 1) {
    const result = await refreshMovieResource(env, saveState, {
      fetcher: async (...args) => {
        usage.tmdbRequests += 1;
        return fetch(...args);
      },
    });
    console.log(JSON.stringify({ batch: batch + 1, ...result }));
    if (["complete", "idle"].includes(result.phase)) break;
    if (result.phase === "busy") await delay(5000);
    if (batch === 599)
      throw new Error(
        "Bootstrap budget reached; cron will continue from the saved checkpoint.",
      );
  }
} finally {
  console.log(JSON.stringify({ movieResourceUsage: usage }));
}
