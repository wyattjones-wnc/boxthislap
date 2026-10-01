import { createHash } from "node:crypto";

export const MEDIA_SOURCES = ["arsenal", "barcelona", "getty"];
export const COMPLETED_STATUSES = new Set(["FT", "FINISHED", "AET", "PEN"]);
const INACTIVE_STATUSES = new Set([
  "ABANDONED",
  "CANCELED",
  "CANCELLED",
  "POSTPONED",
  "SUSPENDED",
]);
const COMPLETION_GRACE_MS = 4 * 60 * 60 * 1000;

export function stableMediaId(prefix, value) {
  return `${prefix}_${createHash("sha256").update(String(value)).digest("hex").slice(0, 20)}`;
}

export function normalizeMediaText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&amp;/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("\\u003d", "=")
    .replaceAll("\\u0026", "&")
    .replaceAll("\\u002F", "/")
    .replaceAll("\\/", "/");
}

function absoluteUrl(value, baseUrl) {
  try {
    return new URL(decodeHtml(value), baseUrl).href;
  } catch {
    return "";
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function stripTags(value) {
  return decodeHtml(
    String(value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function contextAround(html, index, radius = 700) {
  return html.slice(
    Math.max(0, index - radius),
    Math.min(html.length, index + radius),
  );
}

function extractDate(value) {
  const iso = String(value || "").match(/20\d{2}-\d{2}-\d{2}(?:T[^"'<\s]+)?/);
  if (iso) return new Date(iso[0]).toISOString();
  const named = String(value || "").match(
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(20\d{2}|\d{2})\b/i,
  );
  if (!named) return "";
  const year = named[3].length === 2 ? `20${named[3]}` : named[3];
  const date = new Date(`${named[1]} ${named[2]} ${year} UTC`);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString();
}

function extractCount(value) {
  const match = String(value || "").match(
    /(?:imageCount|photoCount|numberOfImages)["']?\s*[:=]\s*["']?(\d+)|\b(\d{1,3})\s+(?:photos|images|snaps)\b/i,
  );
  return match ? Number(match[1] || match[2]) : null;
}

export function classifyGallery(title) {
  const text = normalizeMediaText(title);
  if (/training|practice|workout|prepar|\bsession\b/.test(text))
    return "training";
  if (/behind the scenes|dressing room|inside/.test(text))
    return "behind_scenes";
  if (/celebrat|trophy|victory/.test(text)) return "celebration";
  if (
    /match|win|draw|defeat|action|photos from|best photos|gallery|goals/.test(
      text,
    )
  )
    return "match";
  return "other";
}

function fixtureOpponent(fixture, teamId) {
  if (String(fixture.teamId || "") === teamId && fixture.opponent)
    return String(fixture.opponent);
  if (String(fixture.homeTeamId || "") === teamId)
    return String(fixture.away || "");
  if (String(fixture.awayTeamId || "") === teamId)
    return String(fixture.home || "");
  return String(fixture.opponent || "");
}

export function matchGalleryToFixture(gallery, fixtures) {
  const title = normalizeMediaText(`${gallery.title} ${gallery.summary || ""}`);
  const published = Date.parse(gallery.publishedAt || "");
  const category = gallery.category || classifyGallery(gallery.title);
  const candidates = fixtures
    .filter(
      (fixture) => String(fixture.teamId || "") === String(gallery.teamId),
    )
    .map((fixture) => {
      const evidence = [];
      let score = 0;
      const opponent = normalizeMediaText(
        fixtureOpponent(fixture, String(gallery.teamId)),
      );
      const opponentAliases = unique([
        opponent,
        opponent.replace(/\bfc\b|\bafc\b|\bcf\b/g, "").trim(),
      ]).filter((value) => value.length >= 3);
      if (opponentAliases.some((alias) => title.includes(alias))) {
        score += 50;
        evidence.push("opponent");
      }
      const fixtureTime = Date.parse(
        fixture.timestamp ||
          `${fixture.date || ""}T${fixture.time || "00:00:00"}Z`,
      );
      const hours =
        Number.isFinite(published) && Number.isFinite(fixtureTime)
          ? Math.abs(published - fixtureTime) / 3_600_000
          : Infinity;
      if (hours <= 12) {
        score += 25;
        evidence.push("published-within-12h");
      } else if (hours <= 72) {
        score += 10;
        evidence.push("published-within-72h");
      }
      if (["match", "celebration", "behind_scenes"].includes(category)) {
        score += 15;
        evidence.push(`category:${category}`);
      }
      const clue = normalizeMediaText(
        `${fixture.league || ""} ${fixture.venue || ""}`,
      );
      if (
        clue
          .split(" ")
          .filter((part) => part.length >= 5)
          .some((part) => title.includes(part))
      ) {
        score += 10;
        evidence.push("competition-or-venue");
      }
      return { fixture, score, evidence, hours };
    })
    .filter((candidate) => candidate.hours <= 72 || candidate.score >= 50)
    .sort((a, b) => b.score - a.score || a.hours - b.hours);
  const best = candidates[0];
  if (!best)
    return {
      matchId: "",
      matchConfidence: 0,
      matchStatus: "rejected",
      matchEvidence: [],
    };
  return {
    matchId: best.score >= 70 ? String(best.fixture.matchId || "") : "",
    matchConfidence: best.score,
    matchStatus:
      best.score >= 70 ? "auto" : best.score >= 40 ? "review" : "rejected",
    matchEvidence: best.evidence,
  };
}

export function parseGalleryLinks(html, baseUrl, source) {
  const pattern =
    source === "arsenal"
      ? /href=["']([^"']*\/(?:gallery|photos|news)\/[^"'#?]+)["']/gi
      : /href=["']([^"']*\/football\/first-team\/(?:photos|galleries)\/\d+\/[^"'#?]+)["']/gi;
  const galleries = [];
  for (const match of html.matchAll(pattern)) {
    const url = absoluteUrl(match[1], baseUrl);
    if (!url || galleries.some((gallery) => gallery.sourceUrl === url))
      continue;
    const context = contextAround(html, match.index || 0);
    const titleMatch =
      context.match(/(?:aria-label|title)=["']([^"']{8,180})["']/i) ||
      context.match(/<h[1-4][^>]*>([\s\S]{8,240}?)<\/h[1-4]>/i);
    const slug = decodeURIComponent(
      new URL(url).pathname.split("/").filter(Boolean).at(-1) || "gallery",
    ).replaceAll("-", " ");
    const sourceGalleryId =
      source === "barcelona"
        ? new URL(url).pathname.match(/\/(\d+)\//)?.[1] ||
          stableMediaId("barcelona", url)
        : new URL(url).pathname.split("/").filter(Boolean).at(-1) ||
          stableMediaId("arsenal", url);
    galleries.push({
      source,
      sourceGalleryId,
      sourceUrl: url,
      title: stripTags(titleMatch?.[1] || slug),
      publishedAt: extractDate(context),
      expectedImageCount: extractCount(context),
    });
  }
  return galleries;
}

export function parseArsenalSitemap(
  xml,
  now = Date.now(),
  maximumAgeDays = 45,
) {
  const minimum = now - maximumAgeDays * 86_400_000;
  const galleries = [];
  for (const match of String(xml).matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const sourceUrl = decodeHtml(match[1].match(/<loc>(.*?)<\/loc>/i)?.[1]);
    const publishedAt = decodeHtml(
      match[1].match(/<lastmod>(.*?)<\/lastmod>/i)?.[1],
    );
    let parsed;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      continue;
    }
    const slug = decodeURIComponent(
      parsed.pathname.split("/").filter(Boolean).at(-1) || "",
    );
    const isGallery =
      /^\/(?:photos|gallery)\//.test(parsed.pathname) ||
      (/^\/news\//.test(parsed.pathname) &&
        /gallery|photos?|snaps?|training|inside-training/i.test(slug));
    const timestamp = Date.parse(publishedAt);
    if (!isGallery || !Number.isFinite(timestamp) || timestamp < minimum)
      continue;
    galleries.push({
      source: "arsenal",
      sourceGalleryId: slug || stableMediaId("arsenal", sourceUrl),
      sourceUrl,
      title: slug.replace(/-[a-zA-Z0-9]{12}$/, "").replaceAll("-", " "),
      publishedAt: new Date(timestamp).toISOString(),
      expectedImageCount: extractCount(slug),
    });
  }
  return galleries;
}

export function parseArsenalGalleryId(html) {
  const match = String(html).match(
    /["']type["']\s*:\s*["']GALLERY["'][^{}]{0,200}["']id["']\s*:\s*["'](\d+)["']|["']id["']\s*:\s*["'](\d+)["'][^{}]{0,200}["']type["']\s*:\s*["']GALLERY["']/i,
  );
  return match?.[1] || match?.[2] || "";
}

export function parseArsenalGalleryResponse(payload, gallery) {
  const value = payload?.data?.singleGallery;
  const images = Array.isArray(value?.images) ? value.images : [];
  return images
    .map((item, ordinal) => {
      const renditions = Array.isArray(item?.list) ? item.list : [];
      const preferred = [
        "xxl_landscape",
        "xl_landscape",
        "large_landscape",
        "original",
      ];
      const rendition = preferred
        .map((type) => renditions.find((candidate) => candidate?.type === type))
        .find(Boolean);
      const sourceImageUrl = absoluteUrl(
        rendition?.url || item?.url || item?.originalUrl,
        gallery.sourceUrl,
      );
      if (!plausibleImageUrl(sourceImageUrl, "arsenal")) return null;
      const parsed = new URL(sourceImageUrl);
      const sourceImageKey =
        parsed.pathname.split("/").filter(Boolean).at(-1) ||
        stableMediaId("image", sourceImageUrl);
      return {
        id: stableMediaId("media", `arsenal:${sourceImageKey}`),
        sourceImageKey,
        sourceImageUrl,
        normalizedUrl: `${parsed.origin}${parsed.pathname}`,
        originalPageUrl: gallery.sourceUrl,
        renderMode: "image",
        caption: String(item?.caption || item?.alt || ""),
        credit: String(item?.copyright || ""),
        ordinal,
      };
    })
    .filter(Boolean);
}

function plausibleImageUrl(value, source) {
  let url;
  try {
    url = new URL(decodeHtml(value));
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const full = `${url.hostname}${url.pathname}`.toLowerCase();
  if (/logo|badge|icon|avatar|sprite|placeholder|tracking|pixel/.test(full))
    return false;
  if (
    source === "arsenal" &&
    !/arsenal|afc|cloudfront|amplience|imgix|akamai/.test(full)
  )
    return false;
  if (
    source === "barcelona" &&
    !/barca|fcbarcelona|cloudfront|akamai|imgix|azureedge/.test(full)
  )
    return false;
  return (
    /\.(?:jpe?g|png|webp|avif)(?:$|\?)/i.test(url.href) ||
    /image|media|photo|gallery/i.test(full)
  );
}

export function parseGalleryImages(html, gallery) {
  const candidates = [];
  const attribute =
    /(?:src|data-src|data-original|content)=["'](https:[^"']+)["']/gi;
  const jsonUrl =
    /["'](?:url|src|image|original|downloadUrl)["']\s*:\s*["'](https:[^"']+)["']/gi;
  for (const pattern of [attribute, jsonUrl]) {
    for (const match of html.matchAll(pattern)) {
      const url = decodeHtml(match[1]).split(" ")[0];
      if (plausibleImageUrl(url, gallery.source)) candidates.push(url);
    }
  }
  const images = unique(candidates).map((sourceImageUrl) => {
    const parsed = new URL(sourceImageUrl);
    const sourceImageKey =
      parsed.searchParams.get("id") ||
      parsed.pathname.split("/").filter(Boolean).at(-1) ||
      stableMediaId("image", sourceImageUrl);
    const normalizedUrl = new URL(`${parsed.origin}${parsed.pathname}`);
    if (gallery.source === "barcelona")
      normalizedUrl.searchParams.set("width", "1200");
    return {
      id: stableMediaId("media", `${gallery.source}:${sourceImageKey}`),
      sourceImageKey,
      sourceImageUrl,
      normalizedUrl: normalizedUrl.href,
      originalPageUrl: gallery.sourceUrl,
      renderMode: "image",
      ordinal: 0,
    };
  });
  const preferred = new Map();
  for (const image of images) {
    const current = preferred.get(image.sourceImageKey);
    const score = /\/(?:xl_landscape|large|original)\//i.test(
      image.sourceImageUrl,
    )
      ? 2
      : /\/(?:hero_carousel|gm_preview|small|thumb)\//i.test(
            image.sourceImageUrl,
          )
        ? 0
        : 1;
    if (!current || score > current.score)
      preferred.set(image.sourceImageKey, { image, score });
  }
  return [...preferred.values()].map(({ image }, ordinal) => ({
    ...image,
    ordinal,
  }));
}

export function parseGettyEmbeds(html, originalPageUrl) {
  const embeds = [];
  for (const match of html.matchAll(
    /https:\/\/embed\.gettyimages\.com\/embed\/([^"'&<\s]+)[^"'<\s]*/gi,
  )) {
    const embedUrl = decodeHtml(match[0]);
    const assetId = match[1].split("?")[0];
    if (embeds.some((item) => item.sourceImageKey === assetId)) continue;
    embeds.push({
      id: stableMediaId("media", `getty:${assetId}`),
      sourceImageKey: assetId,
      sourceImageUrl: "",
      normalizedUrl: "",
      originalPageUrl,
      renderMode: "getty_embed",
      embedUrl,
      ordinal: embeds.length,
    });
  }
  return embeds;
}

export function recentCompletedFixtures(schedule, now = Date.now(), days = 30) {
  const minimum = now - days * 86_400_000;
  const schedules = Array.isArray(schedule?.teamSchedules)
    ? schedule.teamSchedules
    : [];
  return schedules
    .filter((entry) => ["1", "2"].includes(String(entry?.team?.id || "")))
    .flatMap((entry) =>
      (entry.fixtures || []).map((fixture) => ({
        ...fixture,
        teamId: String(entry.team.id),
        teamName: entry.team.name,
      })),
    )
    .filter((fixture) => {
      const value = Date.parse(fixture.timestamp || "");
      if (!Number.isFinite(value) || value < minimum || value > now)
        return false;
      const status = String(fixture.status || "").toUpperCase();
      return (
        COMPLETED_STATUSES.has(status) ||
        (!INACTIVE_STATUSES.has(status) && value <= now - COMPLETION_GRACE_MS)
      );
    });
}

export function normalizeDiscoveredGallery(
  gallery,
  teamId,
  fixtures,
  images,
  observedAt = new Date().toISOString(),
) {
  const category = classifyGallery(gallery.title);
  const match = matchGalleryToFixture(
    { ...gallery, teamId, category },
    fixtures,
  );
  const reviewedMatch =
    category === "training" && match.matchStatus === "rejected"
      ? { ...match, matchStatus: "review" }
      : match;
  return {
    id: stableMediaId(
      "gallery",
      `${gallery.source}:${gallery.sourceGalleryId}`,
    ),
    ...gallery,
    teamId,
    category,
    ...reviewedMatch,
    firstObservedAt: observedAt,
    extractionStatus:
      gallery.extractionStatus ||
      (gallery.expectedImageCount && images.length < gallery.expectedImageCount
        ? "partial"
        : "complete"),
    extractionError: gallery.extractionError || "",
    images: reviewedMatch.matchStatus === "rejected" ? [] : images,
  };
}
