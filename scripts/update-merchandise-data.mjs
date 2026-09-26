import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { scanArsenal, scanBarcelona } from "./merchandise/catalog.mjs";

const REPORT_PATH = new URL("../.tmp/merchandise-report.json", import.meta.url);

export async function runMerchandiseUpdate({
  dryRun = false,
  fetchImpl = fetch,
  sources,
  env = process.env,
} = {}) {
  const selectedSources =
    sources ||
    String(env.MERCHANDISE_SOURCES || "barcelona")
      .split(",")
      .map((source) => source.trim().toLowerCase())
      .filter(Boolean);
  if (
    !selectedSources.length ||
    selectedSources.some((source) => !["arsenal", "barcelona"].includes(source))
  ) {
    throw new Error(
      "MERCHANDISE_SOURCES must contain arsenal, barcelona, or both.",
    );
  }
  const startedAt = new Date().toISOString();
  const report = {
    dryRun,
    finishedAt: null,
    healthy: true,
    outcomes: [],
    startedAt,
  };
  const d1 = dryRun ? null : createD1Client(env, fetchImpl);
  for (const source of selectedSources) {
    const scanId = randomUUID();
    const sourceStartedAt = new Date().toISOString();
    const previousScan = d1
      ? await d1.first(
          "SELECT status FROM merch_scans WHERE source = ? ORDER BY finished_at DESC LIMIT 1",
          [source],
        )
      : null;
    try {
      const scan =
        source === "arsenal"
          ? await scanArsenal({
              fetchImpl,
              baseUrl: env.ARSENAL_STORE_URL || undefined,
            })
          : await scanBarcelona({
              fetchImpl,
              baseUrl: env.BARCELONA_STORE_URL || undefined,
            });
      let baseline = true;
      let priorCount = 0;
      if (d1) {
        const previous = await d1.first(
          `SELECT item_count FROM merch_scans WHERE source = ? AND status = 'succeeded' ORDER BY finished_at DESC LIMIT 1`,
          [source],
        );
        baseline = !previous;
        priorCount = Number(previous?.item_count || 0);
      }
      if (priorCount >= 20 && scan.products.length < priorCount * 0.5) {
        const message = `Suspect catalog collapse: ${scan.products.length} items after ${priorCount}.`;
        if (d1)
          await recordScan(d1, {
            id: scanId,
            source,
            startedAt: sourceStartedAt,
            status: "suspect",
            scan,
            error: message,
          });
        throw Object.assign(new Error(message), { recorded: true });
      }
      const newCount = d1
        ? await importScan(d1, {
            id: scanId,
            source,
            startedAt: sourceStartedAt,
            scan,
            baseline,
          })
        : 0;
      report.outcomes.push({
        baseline,
        complete: true,
        itemCount: scan.products.length,
        newCount,
        pageCount: scan.pageCount,
        source,
        status: "succeeded",
      });
    } catch (error) {
      const message = sanitizeError(error);
      report.healthy = false;
      report.outcomes.push({
        alert:
          Boolean(error?.recorded) ||
          (Boolean(previousScan) &&
            String(previousScan?.status || "") !== "succeeded"),
        complete: false,
        error: message,
        itemCount: 0,
        newCount: 0,
        pageCount: 0,
        source,
        status: "failed",
      });
      if (d1 && !error?.recorded)
        await recordScan(d1, {
          id: scanId,
          source,
          startedAt: sourceStartedAt,
          status: "failed",
          error: message,
        });
    }
  }
  report.finishedAt = new Date().toISOString();
  await mkdir(new URL("../.tmp/", import.meta.url), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  if (!report.healthy && !dryRun) process.exitCode = 1;
  return report;
}

async function importScan(d1, { id, source, startedAt, scan, baseline }) {
  const observedAt = new Date().toISOString();
  await d1.batch(
    scan.products.map((product) => ({
      sql: `INSERT INTO merch_products (
      id, source, source_product_id, team, title, canonical_url, image_url, category,
      price_minor, currency, availability, first_observed_at, first_published_at, last_observed_at, new_since, in_scope, source_metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, 0, ?)
    ON CONFLICT(id) DO UPDATE SET
      source_product_id = excluded.source_product_id, team = excluded.team, title = excluded.title,
      canonical_url = excluded.canonical_url, image_url = excluded.image_url, category = excluded.category,
      price_minor = excluded.price_minor, currency = excluded.currency, availability = excluded.availability,
      last_observed_at = excluded.last_observed_at, source_metadata = excluded.source_metadata`,
      params: [
        product.id,
        product.source,
        product.sourceProductId,
        product.team,
        product.title,
        product.canonicalUrl,
        product.imageUrl,
        product.category,
        product.priceMinor,
        product.currency,
        product.availability,
        observedAt,
        observedAt,
        JSON.stringify(product.sourceMetadata || {}),
      ],
    })),
    50,
  );
  const unpublished = baseline
    ? 0
    : Number(
        (
          await d1.first(
            "SELECT COUNT(*) AS count FROM merch_products WHERE source = ? AND first_published_at IS NULL AND id IN (SELECT value FROM json_each(?))",
            [
              source,
              JSON.stringify(scan.products.map((product) => product.id)),
            ],
          )
        )?.count || 0,
      );
  const newCount = baseline ? 0 : unpublished;
  await d1.batch([
    {
      sql: "UPDATE merch_products SET in_scope = 0 WHERE source = ?",
      params: [source],
    },
    {
      sql: `UPDATE merch_products SET
        in_scope = 1,
        new_since = CASE WHEN first_published_at IS NULL AND ? = 0 THEN ? ELSE new_since END,
        first_published_at = COALESCE(first_published_at, ?)
        WHERE source = ? AND id IN (SELECT value FROM json_each(?))`,
      params: [
        baseline ? 1 : 0,
        observedAt,
        observedAt,
        source,
        JSON.stringify(scan.products.map((product) => product.id)),
      ],
    },
    {
      sql: `INSERT INTO merch_scans (id, source, started_at, finished_at, status, scope, item_count, new_count, page_count, complete)
      VALUES (?, ?, ?, ?, 'succeeded', 'full-store', ?, ?, ?, 1)`,
      params: [
        id,
        source,
        startedAt,
        observedAt,
        scan.products.length,
        newCount,
        scan.pageCount || 0,
      ],
    },
  ]);
  return newCount;
}

async function recordScan(d1, { id, source, startedAt, status, scan, error }) {
  await d1.batch([
    {
      sql: `INSERT INTO merch_scans (id, source, started_at, finished_at, status, scope, item_count, new_count, page_count, complete, error_summary)
      VALUES (?, ?, ?, ?, ?, 'full-store', ?, 0, ?, 0, ?)`,
      params: [
        id,
        source,
        startedAt,
        new Date().toISOString(),
        status,
        scan?.products?.length || 0,
        scan?.pageCount || 0,
        sanitizeError(error),
      ],
    },
  ]);
}

export function createD1Client(env, fetchImpl = fetch) {
  const accountId = String(env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const databaseId = String(
    env.MERCHANDISE_D1_DATABASE_ID || "45c405ab-a0cd-442a-b135-b7ffe4b7d933",
  ).trim();
  const token = String(env.CLOUDFLARE_API_TOKEN || "").trim();
  if (!accountId || !databaseId || !token)
    throw new Error(
      "Cloudflare account, database, and API token are required outside dry-run mode.",
    );
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  async function request(statements) {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batch: statements }),
    });
    const value = await response.json().catch(() => null);
    if (
      !response.ok ||
      !value?.success ||
      value.result?.some((result) => !result.success)
    )
      throw new Error(
        value?.errors?.[0]?.message ||
          value?.result?.find((result) => !result.success)?.error ||
          "Cloudflare D1 query failed.",
      );
    return value.result || [];
  }
  return {
    async batch(statements, size = 75) {
      const results = [];
      for (let offset = 0; offset < statements.length; offset += size)
        results.push(
          ...(await request(statements.slice(offset, offset + size))),
        );
      return results;
    },
    async first(sql, params = []) {
      return (await this.rows(sql, params))[0] || null;
    },
    async rows(sql, params = []) {
      return (await request([{ sql, params }]))[0]?.results || [];
    },
  };
}

function sanitizeError(error) {
  return String(error?.message || error || "Unknown scan failure")
    .replace(/https?:\/\/[^\s]+/g, "[url]")
    .slice(0, 500);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const dryRun = process.argv.includes("--dry-run");
  const sourceArg = process.argv
    .find((argument) => argument.startsWith("--source="))
    ?.split("=")[1];
  const sources = sourceArg ? [sourceArg] : undefined;
  const report = await runMerchandiseUpdate({ dryRun, sources });
  console.log(
    JSON.stringify({
      healthy: report.healthy,
      outcomes: report.outcomes.map(({ source, status, itemCount }) => ({
        source,
        status,
        itemCount,
      })),
    }),
  );
}
