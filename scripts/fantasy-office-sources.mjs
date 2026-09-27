const USER_AGENT =
  "Mozilla/5.0 (compatible; BoxThisLapFantasyOffice/1.0; +https://wyattjones-wnc.github.io/boxthislap/)";

export async function discoverMovieSources(movie, year) {
  const results = await Promise.allSettled([
    discoverLetterboxd(movie.title, year),
    discoverRottenTomatoes(movie.title, year),
    discoverBoxOfficeMojo(movie.title, year),
  ]);
  const [letterboxd, rottenTomatoes, boxOfficeMojo] = results.map((result) =>
    result.status === "fulfilled"
      ? result.value
      : {
          error: {
            message: result.reason?.message || "Source discovery failed.",
            type: result.reason?.sourceType || "DISCOVERY_ERROR",
          },
        },
  );
  return { boxOfficeMojo, letterboxd, rottenTomatoes };
}

export async function discoverLetterboxd(title, year) {
  const baseSlug = slug(title);
  const slugs = [...new Set([baseSlug, `${baseSlug}-${year}`])];
  for (const candidateSlug of slugs) {
    const url = `https://letterboxd.com/film/${candidateSlug}/`;
    try {
      const identity = extractLetterboxdIdentity(await fetchSource(url), url);
      const confidence = sourceConfidence(title, year, identity);
      if (confidence >= 0.8) return { ...identity, confidence, url };
    } catch (error) {
      if (!["HTTP_ERROR", "PARSE_ERROR"].includes(error.sourceType))
        throw error;
    }
  }
  return null;
}

export async function discoverRottenTomatoes(title, year) {
  const searchUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(title)}`;
  const candidates = extractRottenTomatoesCandidates(
    await fetchSource(searchUrl),
  );
  return bestCandidate(candidates, title, year);
}

export async function discoverBoxOfficeMojo(title, year) {
  const searchUrl = `https://www.boxofficemojo.com/search/?q=${encodeURIComponent(title)}`;
  const candidates = extractBoxOfficeMojoCandidates(
    await fetchSource(searchUrl),
  );
  const candidate = bestCandidate(candidates, title, year, 0.72);
  if (!candidate) return null;
  const titleHtml = await fetchSource(candidate.url);
  const identity = extractBoxOfficeMojoIdentity(titleHtml, candidate.url);
  const confidence = sourceConfidence(title, year, {
    title: identity.title || candidate.title,
    year: identity.year || candidate.year,
  });
  if (confidence < 0.72 || !identity.url) return null;
  return { ...identity, confidence };
}

export function extractLetterboxdIdentity(html, url = "") {
  const match = String(html).match(
    /property=["']og:title["'][^>]*content=["']([^"']+?)\s*\((\d{4})\)["']/i,
  );
  if (!match)
    throw sourceError(
      "PARSE_ERROR",
      "Letterboxd title and year were not found.",
    );
  return { title: decodeHtml(match[1]).trim(), url, year: Number(match[2]) };
}

export function extractRottenTomatoesCandidates(html) {
  const candidates = [];
  for (const row of String(html).matchAll(
    /<search-page-media-row\b([^>]*)>([\s\S]*?)<\/search-page-media-row>/gi,
  )) {
    const href = row[2].match(
      /<a\b[^>]*href=["'](https?:\/\/www\.rottentomatoes\.com\/m\/[^"']+)["'][^>]*data-qa=["']info-name["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!href) continue;
    candidates.push({
      title: textContent(href[2]),
      url: href[1].split("?")[0],
      year: Number(row[1].match(/release-year=["'](\d{4})["']/i)?.[1]) || null,
    });
  }
  return uniqueCandidates(candidates);
}

export function extractBoxOfficeMojoCandidates(html) {
  const candidates = [];
  for (const row of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const title = row[1].match(
      /href=["'](\/title\/tt\d+\/)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!title) continue;
    const years = [...row[1].matchAll(/>(19\d{2}|20\d{2})</g)];
    candidates.push({
      title: textContent(title[2]),
      url: new URL(title[1], "https://www.boxofficemojo.com").href,
      year: Number(years[0]?.[1]) || null,
    });
  }
  if (candidates.length) return uniqueCandidates(candidates);
  for (const match of String(html).matchAll(
    /href=["'](\/title\/tt\d+\/)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    candidates.push({
      title: textContent(match[2]),
      url: new URL(match[1], "https://www.boxofficemojo.com").href,
      year: null,
    });
  }
  return uniqueCandidates(candidates);
}

export function extractBoxOfficeMojoIdentity(html) {
  const release = String(html).match(
    /href=["'](\/release\/(rl\d+)\/)[^"']*["']/i,
  );
  if (!release)
    throw sourceError(
      "PARSE_ERROR",
      "Box Office Mojo domestic release was not found.",
    );
  const heading = String(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const year = String(html).match(
    /Earliest Release Date[\s\S]{0,180}?(19\d{2}|20\d{2})/i,
  );
  return {
    releaseId: release[2].toLowerCase(),
    title: heading
      ? textContent(heading[1]).replace(/\s*\(\d{4}\)\s*$/, "")
      : "",
    url: new URL(release[1], "https://www.boxofficemojo.com").href,
    year: Number(year?.[1]) || null,
  };
}

export function bestCandidate(candidates, title, year, minimum = 0.8) {
  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      confidence: sourceConfidence(title, year, candidate),
    }))
    .sort((left, right) => right.confidence - left.confidence);
  return ranked[0]?.confidence >= minimum ? ranked[0] : null;
}

export function sourceConfidence(expectedTitle, expectedYear, candidate) {
  const expected = normalizeTitle(expectedTitle);
  const actual = normalizeTitle(candidate.title);
  if (!expected || !actual) return 0;
  const titleScore =
    expected === actual ? 1 : tokenSimilarity(expected, actual);
  const candidateYear = Number(candidate.year) || 0;
  const yearScore = !candidateYear
    ? 0.75
    : candidateYear === Number(expectedYear)
      ? 1
      : Math.abs(candidateYear - Number(expectedYear)) === 1
        ? 0.65
        : 0;
  return Number((titleScore * 0.8 + yearScore * 0.2).toFixed(3));
}

function tokenSimilarity(left, right) {
  const leftTokens = new Set(left.split(" "));
  const rightTokens = new Set(right.split(" "));
  const common = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  ).length;
  return common / Math.max(leftTokens.size, rightTokens.size);
}

function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slug(value) {
  return normalizeTitle(value).replace(/\s+/g, "-");
}

function textContent(value) {
  return decodeHtml(String(value).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return String(value)
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&colon;/gi, ":")
    .replace(/&nbsp;/gi, " ");
}

function uniqueCandidates(candidates) {
  return [
    ...new Map(
      candidates.map((candidate) => [candidate.url, candidate]),
    ).values(),
  ];
}

export function extractLetterboxdRating(html) {
  const match = String(html).match(
    /["']ratingValue["']\s*[:=]\s*["']?([0-5](?:\.\d+)?)/i,
  );
  if (match) return { state: "available", value: Number(match[1]) };
  if (/application\/ld\+json/i.test(html) && /["']Movie["']/i.test(html)) {
    return { state: "not_available", value: null };
  }
  throw sourceError(
    "PARSE_ERROR",
    "Letterboxd movie identity could not be verified.",
  );
}

export function extractTomatometer(html) {
  const patterns = [
    /tomatometerscore=["'](\d{1,3})["']/i,
    /tomatometerScore["']?\s*[:=]\s*["']?(\d{1,3})/i,
    /criticsScore[\s\S]{0,160}?["']score["']\s*:\s*["']?(\d{1,3})/i,
  ];
  for (const pattern of patterns) {
    const match = String(html).match(pattern);
    if (match) return { state: "available", value: Number(match[1]) };
  }
  if (
    /score-board|media-scorecard|tomatometer/i.test(html) &&
    /tomatometerscore=["']["']|["']score["']\s*:\s*null/i.test(html)
  ) {
    return { state: "not_available", value: null };
  }
  throw sourceError(
    "PARSE_ERROR",
    "Tomatometer state could not be identified.",
  );
}

export function extractDomesticGross(html) {
  const normalized = String(html).replace(/&nbsp;/gi, " ");
  const patterns = [
    /Domestic[\s\S]{0,500}?\$([\d,]+)/i,
    /domesticGross["']?\s*[:=]\s*["']?\$?([\d,]+)/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return { state: "available", value: Number(match[1].replace(/,/g, "")) };
    }
  }
  if (
    /Domestic/i.test(normalized) &&
    /Release Date|Summary|Details/i.test(normalized)
  ) {
    return { state: "not_available", value: null };
  }
  throw sourceError(
    "PARSE_ERROR",
    "Domestic gross state could not be identified.",
  );
}

export function extractWeekendWinners(html, year) {
  const winners = new Map();
  for (const row of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const content = row[1];
    const week = content.match(
      new RegExp(`/weekend/${year}W(\\d{1,2})(?:/|["'?])`, "i"),
    );
    const releases = [...content.matchAll(/\/release\/(rl\d+)\//gi)];
    if (!week || releases.length === 0) continue;
    const weekNumber = Number(week[1]);
    const releaseId = releases.at(-1)[1].toLowerCase();
    if (!winners.has(weekNumber)) winners.set(weekNumber, releaseId);
  }
  if (winners.size === 0) {
    throw sourceError(
      "PARSE_ERROR",
      "No completed domestic weekend winners were found.",
    );
  }
  return winners;
}

export function countNumberOneWeekends(winners, releaseId) {
  const target = String(releaseId || "").toLowerCase();
  return [...winners.values()].filter((winner) => winner === target).length;
}

export function releaseIdFromUrl(url) {
  return (
    String(url || "")
      .match(/\/release\/(rl\d+)\//i)?.[1]
      ?.toLowerCase() ?? ""
  );
}

export async function fetchSource(url, options = {}) {
  const response = await fetch(url, {
    headers: { Accept: "text/html", "User-Agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(options.timeoutMs ?? 20_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw Object.assign(
      sourceError(
        response.status === 429 ? "RATE_LIMITED" : "HTTP_ERROR",
        `Source returned HTTP ${response.status}.`,
      ),
      { responseText: text },
    );
  }
  return text;
}

export function sourceError(type, message) {
  return Object.assign(new Error(message), { sourceType: type });
}
