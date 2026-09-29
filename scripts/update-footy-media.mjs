import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import {
  normalizeDiscoveredGallery,
  parseArsenalSitemap,
  parseGalleryImages,
  parseGalleryLinks,
  parseGettyEmbeds,
  recentCompletedFixtures,
  stableMediaId,
} from "./footy-media/sources.mjs";

const endpoint = String(process.env.FOOTY_MEDIA_SYNC_ENDPOINT || "").replace(
  /\/$/,
  "",
);
const token = String(process.env.FOOTY_MEDIA_SYNC_TOKEN || "");
const requestId = String(
  process.env.FOOTY_MEDIA_REQUEST_ID ||
    process.argv
      .find((value) => value.startsWith("--request-id="))
      ?.slice(13) ||
    crypto.randomUUID(),
);
const dryRun = process.argv.includes("--dry-run");
const reportPath = resolve(".tmp/footy-media-report.json");
const schedule = JSON.parse(
  await readFile(resolve("data/footy-schedule.json"), "utf8"),
);
const fixtures = recentCompletedFixtures(schedule);
const observedAt = new Date().toISOString();
const browserState = { browser: null };

if (!dryRun && (!endpoint || !token))
  throw new Error(
    "FOOTY_MEDIA_SYNC_ENDPOINT and FOOTY_MEDIA_SYNC_TOKEN are required.",
  );

const report = {
  requestId,
  startedAt: observedAt,
  finishedAt: "",
  sources: [],
  galleries: [],
  summary: {},
};

try {
  if (!dryRun) await sync("start", {});
  const scans = [scanClub("arsenal"), scanClub("barcelona"), scanGetty()];
  const settled = await Promise.all(scans);
  report.sources = settled.map((value) => value.run);
  report.galleries = settled.flatMap((value) => value.galleries);
  if (!dryRun)
    await sync("import", {
      sourceRuns: report.sources,
      galleries: report.galleries,
    });
  const errorSources = report.sources.filter(
    (source) => source.status !== "completed",
  );
  report.summary = {
    sourceCount: report.sources.length,
    galleryCount: report.galleries.length,
    newImageCount: new Set(
      report.galleries.flatMap((gallery) =>
        gallery.images.map((image) => image.id),
      ),
    ).size,
    existingImageCount: 0,
    unmatchedGalleryCount: report.galleries.filter(
      (gallery) => gallery.matchStatus === "review",
    ).length,
    errorCount: errorSources.length,
    errorSummary: errorSources
      .map((source) => `${source.source}: ${source.error}`)
      .join("; "),
  };
  report.finishedAt = new Date().toISOString();
  const status =
    errorSources.length === 0
      ? "completed"
      : report.galleries.length
        ? "partial"
        : "failed";
  if (!dryRun)
    await sync("finish", {
      status,
      summary: report.summary,
      report: { sources: report.sources },
    });
  await saveReport();
  if (status === "failed") process.exitCode = 1;
} catch (error) {
  report.finishedAt = new Date().toISOString();
  report.summary = {
    ...report.summary,
    errorCount: Number(report.summary.errorCount || 0) + 1,
    errorSummary: error.message,
  };
  if (!dryRun)
    await sync("finish", {
      status: "failed",
      summary: report.summary,
      report: { sources: report.sources },
    }).catch(() => {});
  await saveReport();
  throw error;
} finally {
  await browserState.browser?.close();
}

async function scanClub(source) {
  const startedAt = new Date().toISOString();
  const run = {
    id: `${requestId}:${source}`,
    source,
    startedAt,
    finishedAt: "",
    status: "running",
    pagesScanned: 0,
    galleriesFound: 0,
    imagesFound: 0,
    error: "",
  };
  try {
    const teamId = source === "arsenal" ? "1" : "2";
    const indexes =
      source === "arsenal"
        ? ["https://www.arsenal.com/sitemaps/articles/1/sitemap.xml"]
        : [
            "https://www.fcbarcelona.com/en/football/first-team/photos",
            "https://www.fcbarcelona.com/en/football/first-team/galleries",
          ];
    const discovered = [];
    for (const url of indexes) {
      const html = await fetchText(url, {
        browserFallback: source === "arsenal",
      });
      run.pagesScanned += 1;
      const parsed =
        source === "arsenal"
          ? parseArsenalSitemap(html)
          : parseGalleryLinks(html, url, source);
      for (const gallery of parsed) {
        if (
          !discovered.some(
            (item) => item.sourceGalleryId === gallery.sourceGalleryId,
          )
        )
          discovered.push(gallery);
      }
    }
    const galleries = [];
    for (const gallery of discovered.slice(0, 80)) {
      const preliminary = normalizeDiscoveredGallery(
        gallery,
        teamId,
        fixtures,
        [],
        observedAt,
      );
      if (preliminary.matchStatus === "rejected") continue;
      try {
        const html = await fetchText(gallery.sourceUrl, {
          browserFallback: source === "arsenal",
        });
        run.pagesScanned += 1;
        const images = parseGalleryImages(html, gallery);
        const normalized = normalizeDiscoveredGallery(
          gallery,
          teamId,
          fixtures,
          images,
          observedAt,
        );
        if (normalized.matchStatus !== "rejected") galleries.push(normalized);
      } catch (error) {
        galleries.push({
          ...preliminary,
          extractionStatus: "failed",
          extractionError: error.message,
        });
      }
    }
    run.galleriesFound = galleries.length;
    run.imagesFound = galleries.reduce(
      (total, gallery) => total + gallery.images.length,
      0,
    );
    const failedExtractions = galleries.filter(
      (gallery) => gallery.extractionStatus === "failed",
    );
    run.status = failedExtractions.length
      ? "suspect"
      : galleries.length ||
          !fixtures.some((fixture) => fixture.teamId === teamId)
        ? "completed"
        : "suspect";
    if (failedExtractions.length) {
      run.error = `${failedExtractions.length} relevant galleries could not be extracted.`;
    } else if (run.status === "suspect") {
      run.error =
        "No relevant galleries were parsed for recent completed fixtures.";
    }
    return { run: finishRun(run), galleries };
  } catch (error) {
    run.status = "failed";
    run.error = error.message;
    return { run: finishRun(run), galleries: [] };
  }
}

async function scanGetty() {
  const source = "getty";
  const startedAt = new Date().toISOString();
  const run = {
    id: `${requestId}:${source}`,
    source,
    startedAt,
    finishedAt: "",
    status: "running",
    pagesScanned: 0,
    galleriesFound: 0,
    imagesFound: 0,
    error: "",
  };
  const galleries = [];
  try {
    for (const fixture of fixtures.slice(0, 16)) {
      const date = String(fixture.date || fixture.timestamp || "").slice(0, 10);
      const opponent =
        fixture.opponent ||
        (fixture.homeTeamId === fixture.teamId ? fixture.away : fixture.home) ||
        "";
      const query = encodeURIComponent(
        `${fixture.teamName} ${opponent} ${date}`,
      );
      const url = `https://www.gettyimages.com/photos/${query}?assettype=image&family=editorial&phrase=${query}&sort=mostpopular`;
      const html = await fetchText(url, { browserFallback: true });
      run.pagesScanned += 1;
      const images = parseGettyEmbeds(html, url);
      if (!images.length) continue;
      const gallery = {
        id: stableMediaId("gallery", `getty:${fixture.matchId}`),
        source,
        sourceGalleryId: String(fixture.matchId),
        sourceUrl: url,
        title: `Getty embeds for ${fixture.home} v ${fixture.away}`,
        publishedAt: fixture.timestamp,
        expectedImageCount: images.length,
        teamId: String(fixture.teamId),
        matchId: String(fixture.matchId),
        category: "match",
        matchConfidence: 100,
        matchStatus: "auto",
        matchEvidence: ["fixture-search"],
        firstObservedAt: observedAt,
        extractionStatus: "complete",
        extractionError: "",
        images,
      };
      galleries.push(gallery);
    }
    run.galleriesFound = galleries.length;
    run.imagesFound = galleries.reduce(
      (total, gallery) => total + gallery.images.length,
      0,
    );
    run.status = galleries.length ? "completed" : "suspect";
    if (!galleries.length) {
      run.error =
        "Getty public search did not expose licensed embed URLs; Getty API access is required.";
    }
    return { run: finishRun(run), galleries };
  } catch (error) {
    run.status = "failed";
    run.error = error.message;
    return { run: finishRun(run), galleries };
  }
}

function finishRun(run) {
  run.finishedAt = new Date().toISOString();
  return run;
}

async function fetchText(
  url,
  { browserFallback = false, browserRender = false } = {},
) {
  if (browserRender) return renderPage(url);
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (compatible; BoxThisLapMedia/1.0; +https://wyattjones-wnc.github.io/boxthislap/)",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.ok) return response.text();
  if (!browserFallback || ![403, 429].includes(response.status))
    throw new Error(`${url} returned HTTP ${response.status}.`);
  return renderPage(url);
}

async function renderPage(url) {
  const { chromium } = await import("playwright");
  browserState.browser ||= await chromium.launch({ headless: true });
  const page = await browserState.browser.newPage({ locale: "en-US" });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(3_000);
    return await page.content();
  } finally {
    await page.close();
  }
}

async function sync(action, body) {
  const response = await fetch(
    `${endpoint}/api/match-media/sync/scans/${encodeURIComponent(requestId)}/${action}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Media-Sync-Token": token,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    },
  );
  const value = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      value.error ||
        `Match media sync ${action} failed with HTTP ${response.status}.`,
    );
  return value;
}

async function saveReport() {
  await mkdir(resolve(".tmp"), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(
  JSON.stringify({ requestId, dryRun, summary: report.summary }, null, 2),
);
