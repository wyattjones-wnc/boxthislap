const US_SOCCER_BASE_URL = "https://www.ussoccer.com";

export async function loadUsSoccerRoster(teamSlug, fetchImpl = fetch) {
  const slug = String(teamSlug || "").trim().toLowerCase();
  if (!slug) return [];

  const response = await fetchImpl(`${US_SOCCER_BASE_URL}/teams/${encodeURIComponent(slug)}/roster`, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "BoxThisLap/1.0 (+https://github.com/wyattjones-wnc/boxthislap)",
    },
  });
  if (!response.ok) throw new Error(`U.S. Soccer ${slug} roster returned ${response.status}.`);
  return parseUsSoccerRoster(await response.text());
}

export function parseUsSoccerRoster(html) {
  const players = new Map();
  const cards = String(html || "").match(/<section\b[^>]*PlayerThumbnail[\s\S]*?<\/section>/gi) || [];

  for (const card of cards) {
    const path = matchAttribute(card, /\bhref="([^"]*\/players\/[^"]+)"/i);
    const nameMarkup = matchContent(card, /<div\b[^>]*PlayerThumbnail_playerName[^>]*>([\s\S]*?)<\/div>/i);
    const positionMarkup = matchContent(card, /<div\b[^>]*PlayerThumbnail_playerPosition[^>]*>([\s\S]*?)<\/div>/i);
    if (!path || !nameMarkup || !positionMarkup) continue;

    const nameAndNumber = cleanHtmlText(nameMarkup);
    const numberMatch = nameAndNumber.match(/^(\d+)\s+(.+)$/);
    const name = String(numberMatch?.[2] || nameAndNumber).trim();
    const providerPlayerId = path.replace(/^.*\/players\//i, "").replace(/^\/+|\/+$/g, "");
    if (!providerPlayerId || !name) continue;

    const image = matchAttribute(card, /<img\b[^>]*\bsrc="([^"]+)"/i);
    players.set(providerPlayerId, {
      id: providerPlayerId,
      name,
      position: cleanHtmlText(positionMarkup),
      number: String(numberMatch?.[1] || ""),
      profileImage: decodeHtml(image),
      cardImage: decodeHtml(image),
      homeCountry: "United States",
    });
  }

  return [...players.values()];
}

function matchAttribute(value, pattern) {
  return String(value || "").match(pattern)?.[1] || "";
}

function matchContent(value, pattern) {
  return String(value || "").match(pattern)?.[1] || "";
}

function cleanHtmlText(value) {
  return decodeHtml(String(value || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
