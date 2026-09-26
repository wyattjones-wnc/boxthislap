import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createHash, randomUUID } from "node:crypto";
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
      let previous = null;
      if (d1) {
        previous = await d1.first(
          `SELECT item_count, content_hash FROM merch_scans WHERE source = ? AND status = 'succeeded' ORDER BY finished_at DESC LIMIT 1`,
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
      const contentHash = scanContentHash(scan.products);
      const unchanged = Boolean(
        previous?.content_hash && previous.content_hash === contentHash,
      );
      const newCount = d1
        ? unchanged
          ? await recordSuccessfulScan(d1, {
              contentHash,
              id: scanId,
              scan,
              source,
              startedAt: sourceStartedAt,
            })
          : await importScan(d1, {
              baseline,
              contentHash,
              id: scanId,
              scan,
              source,
              startedAt: sourceStartedAt,
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
        unchanged,
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

async function importScan(
  d1,
  { baseline, contentHash, id, scan, source, startedAt },
) {
  const observedAt = new Date().toISOString();
  const existingRows = await d1.rows(
    `SELECT id, title, canonical_url, image_url, category, price_minor, currency,
      availability, in_scope, source_metadata, first_published_at
     FROM merch_products WHERE source = ?`,
    [source],
  );
  const existing = new Map(existingRows.map((row) => [String(row.id), row]));
  const currentIds = new Set(scan.products.map((product) => product.id));
  const changedProducts = scan.products.filter((product) =>
    productChanged(existing.get(product.id), product),
  );
  const activateIds = scan.products
    .filter((product) => !existing.get(product.id)?.in_scope)
    .map((product) => product.id);
  const missingIds = existingRows
    .filter((row) => row.in_scope && !currentIds.has(String(row.id)))
    .map((row) => String(row.id));

  await d1.batch(
    changedProducts.map((product) => ({
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
    : scan.products.filter(
        (product) => !existing.get(product.id)?.first_published_at,
      ).length;
  const newCount = baseline ? 0 : unpublished;
  const finalStatements = [];
  if (missingIds.length) {
    finalStatements.push({
      sql: "UPDATE merch_products SET in_scope = 0 WHERE source = ? AND id IN (SELECT value FROM json_each(?))",
      params: [source, JSON.stringify(missingIds)],
    });
  }
  if (activateIds.length) {
    finalStatements.push({
      sql: "UPDATE merch_products SET in_scope = 1 WHERE source = ? AND id IN (SELECT value FROM json_each(?))",
      params: [source, JSON.stringify(activateIds)],
    });
  }
  finalStatements.push(
    {
      sql: `UPDATE merch_products SET
        new_since = CASE WHEN ? = 0 THEN ? ELSE new_since END,
        first_published_at = ?
        WHERE source = ? AND first_published_at IS NULL AND id IN (SELECT value FROM json_each(?))`,
      params: [
        baseline ? 1 : 0,
        observedAt,
        observedAt,
        source,
        JSON.stringify(scan.products.map((product) => product.id)),
      ],
    },
    {
      sql: `INSERT INTO merch_scans (id, source, started_at, finished_at, status, scope, item_count, new_count, page_count, complete, content_hash)
      VALUES (?, ?, ?, ?, 'succeeded', 'full-store', ?, ?, ?, 1, ?)`,
      params: [
        id,
        source,
        startedAt,
        observedAt,
        scan.products.length,
        newCount,
        scan.pageCount || 0,
        contentHash,
      ],
    },
  );
  await d1.batch(finalStatements);
  return newCount;
}

async function recordSuccessfulScan(
  d1,
  { contentHash, id, scan, source, startedAt },
) {
  await d1.batch([
    {
      sql: `INSERT INTO merch_scans (id, source, started_at, finished_at, status, scope, item_count, new_count, page_count, complete, content_hash)
      VALUES (?, ?, ?, ?, 'succeeded', 'full-store', ?, 0, ?, 1, ?)`,
      params: [
        id,
        source,
        startedAt,
        new Date().toISOString(),
        scan.products.length,
        scan.pageCount || 0,
        contentHash,
      ],
    },
  ]);
  return 0;
}

export function productChanged(row, product) {
  if (!row) return true;
  return (
    row.title !== product.title ||
    row.canonical_url !== product.canonicalUrl ||
    (row.image_url || null) !== product.imageUrl ||
    row.category !== product.category ||
    (row.price_minor === null ? null : Number(row.price_minor)) !==
      product.priceMinor ||
    (row.currency || null) !== product.currency ||
    row.availability !== product.availability ||
    String(row.source_metadata || "{}") !==
      JSON.stringify(product.sourceMetadata || {})
  );
}

export function scanContentHash(products) {
  const stable = [...products]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((product) => ({
      availability: product.availability,
      canonicalUrl: product.canonicalUrl,
      category: product.category,
      currency: product.currency,
      id: product.id,
      imageUrl: product.imageUrl,
      priceMinor: product.priceMinor,
      sourceMetadata: product.sourceMetadata,
      title: product.title,
    }));
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

export function buildBaselineSql(scan, observedAt = new Date().toISOString()) {
  const statements = [];
  const columns = `id, source, source_product_id, team, title, canonical_url, image_url, category, price_minor, currency, availability, first_observed_at, first_published_at, last_observed_at, new_since, in_scope, source_metadata`;
  for (let offset = 0; offset < scan.products.length; offset += 40) {
    const values = scan.products
      .slice(offset, offset + 40)
      .map((product) =>
        [
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
          product.sourceMetadata?.publishedAt || null,
          observedAt,
          null,
          1,
          JSON.stringify(product.sourceMetadata || {}),
        ]
          .map(sqlLiteral)
          .join(", "),
      );
    statements.push(
      `INSERT INTO merch_products (${columns}) VALUES\n  (${values.join("),\n  (")});`,
    );
  }
  statements.push(
    `INSERT INTO merch_scans (id, source, started_at, finished_at, status, scope, item_count, new_count, page_count, complete, content_hash) VALUES (${[
      randomUUID(),
      scan.source,
      observedAt,
      observedAt,
      "succeeded",
      "full-store",
      scan.products.length,
      0,
      scan.pageCount || 0,
      1,
      scanContentHash(scan.products),
    ]
      .map(sqlLiteral)
      .join(", ")});`,
    "",
  );
  return statements.join("\n");
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "NULL";
    return String(value);
  }
  return `'${String(value).replaceAll("'", "''")}'`;
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
  if (process.argv.includes("--write-baseline-sql")) {
    const scan = await scanBarcelona({
      baseUrl: process.env.BARCELONA_STORE_URL || undefined,
    });
    const output = new URL("../.tmp/merchandise-baseline.sql", import.meta.url);
    await mkdir(new URL(".", output), { recursive: true });
    await writeFile(output, buildBaselineSql(scan), "utf8");
    console.log(
      JSON.stringify({
        itemCount: scan.products.length,
        output: ".tmp/merchandise-baseline.sql",
      }),
    );
  } else {
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
}
