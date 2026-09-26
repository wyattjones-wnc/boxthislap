const USER_AGENT =
  "Mozilla/5.0 (compatible; BoxThisLapFantasyOffice/1.0; +https://wyattjones-wnc.github.io/boxthislap/)";

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
