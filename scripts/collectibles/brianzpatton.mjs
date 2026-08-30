import { createHash } from "node:crypto";

export const SOURCE_HOME = "https://www.brianzpatton.com/";
export const HOT_WHEELS_2001 = new URL("HotWheels/2001/index.html", SOURCE_HOME).href;

export function parseHomepageCategories(html, sourceUrl = SOURCE_HOME) {
  const categories = new Map();
  const linkPattern = /<(?:a|area)\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
  const sourceHost = new URL(sourceUrl).hostname.replace(/^www\./i, "").toLowerCase();
  let match;
  let order = 0;
  while ((match = linkPattern.exec(html))) {
    let url;
    try { url = new URL(decodeHtml(match[1]), sourceUrl); } catch { continue; }
    if (url.hostname.replace(/^www\./i, "").toLowerCase() !== sourceHost) continue;
    const firstSegment = url.pathname.split("/").filter(Boolean)[0] || "";
    if (!firstSegment || /^(images?|assets?|css|js)$/i.test(firstSegment) || /^\d{4}$/.test(firstSegment)) continue;
    const canonical = canonicalCategory(firstSegment);
    const name = canonical.name;
    if (!name || name.length > 80) continue;
    const slug = canonical.slug;
    if (!slug || categories.has(slug)) continue;
    categories.set(slug, {
      slug,
      name,
      type: /hot.?wheels|spin.?master|green.?light/i.test(`${name} ${firstSegment}`)
        ? "manufacturer"
        : /errors?|prototypes?/i.test(name) ? "reference" : "collection",
      checklistMode: /errors?/i.test(name) ? "reference_only" : /prototypes?/i.test(name) ? "optional" : "normal",
      sourceUrl: new URL(`${firstSegment}/`, sourceUrl).href,
      sourceSortOrder: order++,
    });
  }
  return [...categories.values()];
}

export function parseHotWheels2001(html, overrides = { groups: [] }) {
  const cards = parseCards(html, HOT_WHEELS_2001);
  const listMatch = html.match(/2001\s+1:64\s+HOT\s+WHEELS\s+MONSTER\s+TRUCK\s+LIST([\s\S]*?)2001\s+1:43/i);
  if (!listMatch) throw new Error("The 2001 Hot Wheels checklist section was not found.");
  const sourceRows = [];
  const rowPattern = /(?:<br\s*\/?>\s*)?(\d{5})\s+([^<\r\n]+)/gi;
  let match;
  let order = 0;
  while ((match = rowPattern.exec(listMatch[1]))) {
    const sourceName = decodeHtml(match[2]).replace(/\s+/g, " ").trim();
    if (!sourceName) continue;
    const sourceKey = `hot-wheels:2001:1-64:${match[1]}:${slugify(sourceName)}`;
    if (sourceRows.some((row) => row.sourceKey === sourceKey)) continue;
    sourceRows.push({ itemNumber: match[1], sourceName, sourceKey, sourceSortOrder: order++ });
  }
  if (!sourceRows.length) throw new Error("No 2001 Hot Wheels checklist rows were parsed.");

  const groups = new Map();
  for (const row of sourceRows) {
    const key = row.itemNumber;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()].map(([itemNumber, rows]) => {
    const override = overrides.groups?.find((group) => group.sourceKeys?.some((key) => rows.some((row) => row.sourceKey === key)));
    const canonicalName = override?.canonicalName || commonCanonicalName(rows.map((row) => row.sourceName));
    const matchingCard = cards.find((card) => normalize(card.name).startsWith(normalize(canonicalName))) || cards.find((card) => normalize(canonicalName).startsWith(normalize(card.name)));
    const id = stableId("clt", `hot-wheels|monster-jam|2001|1:64|${itemNumber}`);
    return {
      id,
      itemNumber,
      name: canonicalName,
      normalizedName: normalize(canonicalName),
      year: 2001,
      scale: "1:64",
      sourceSortOrder: Math.min(...rows.map((row) => row.sourceSortOrder)),
      sourceUrl: matchingCard?.detailUrl || HOT_WHEELS_2001,
      primaryImageUrl: matchingCard?.imageUrl || "",
      variants: rows.map((row) => ({
        id: stableId("var", row.sourceKey),
        sourceName: row.sourceName,
        variantName: variantSuffix(canonicalName, row.sourceName),
        sourceUrl: matchingCard?.detailUrl || HOT_WHEELS_2001,
        sourceItemNumber: itemNumber,
      })),
    };
  });
}

export function parseDetailImages(html, detailUrl) {
  const values = [];
  const imagePattern = /<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imagePattern.exec(html))) {
    let url;
    try { url = new URL(decodeHtml(match[1]), detailUrl).href; } catch { continue; }
    if (!/\.(?:jpe?g|png|webp)(?:$|\?)/i.test(url) || /(?:bar|logo|tread)/i.test(url)) continue;
    if (!values.includes(url)) values.push(url);
  }
  return values;
}

function parseCards(html, sourceUrl) {
  const cards = [];
  const cells = html.match(/<td\b[\s\S]*?<\/td>/gi) || [];
  for (const cell of cells) {
    const href = cell.match(/<a\b[^>]*href=["']([^"']+)["']/i)?.[1];
    const image = cell.match(/<img\b[^>]*src=["']([^"']+)["']/i)?.[1];
    if (!href || !image || !/\.htm(?:l)?$/i.test(href)) continue;
    const name = stripHtml(cell.replace(/^[\s\S]*?<\/a>/i, "")).replace(/^\s+|\s+$/g, "");
    if (!name) continue;
    cards.push({ name, detailUrl: new URL(decodeHtml(href), sourceUrl).href, imageUrl: new URL(decodeHtml(image), sourceUrl).href });
  }
  return cards;
}

function commonCanonicalName(names) {
  if (names.length === 1) return names[0];
  const tokens = names.map((name) => name.split(/\s+/));
  const common = [];
  for (let index = 0; index < Math.min(...tokens.map((parts) => parts.length)); index += 1) {
    if (!tokens.every((parts) => parts[index].toLowerCase() === tokens[0][index].toLowerCase())) break;
    common.push(tokens[0][index]);
  }
  return common.length ? common.join(" ") : names[0];
}
function variantSuffix(canonical, sourceName) { const suffix = sourceName.slice(canonical.length).trim(); return suffix || null; }
function stableId(prefix, value) { return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`; }
function normalize(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function slugify(value) { return normalize(value).replace(/\s+/g, "-"); }
function wordsFromSlug(value) { return decodeURIComponent(value).replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function canonicalCategory(value) {
  const key = slugify(value).replace(/-/g, "");
  if (key === "hotwheels") return { slug: "hot-wheels", name: "Hot Wheels" };
  if (key === "spinmaster") return { slug: "spin-master", name: "Spin Master" };
  if (key === "greenlight") return { slug: "greenlight", name: "GreenLight" };
  return { slug: slugify(value), name: wordsFromSlug(value) };
}
function stripHtml(value) { return decodeHtml(String(value || "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }
function decodeHtml(value) { return String(value || "").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number))); }
