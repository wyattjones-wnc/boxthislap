const CATEGORY_RULES = [
  [
    "kits",
    /\b(jersey|kit|goalkeeper)\b|\b(home|away|third|fourth).{0,24}\bshirt\b|\bshirt\b.{0,24}\b(home|away|third|fourth)\b/i,
  ],
  ["footwear", /\b(shoe|shoes|trainer|sneaker|boot|slipper|slider)\b/i],
  [
    "home",
    /\b(homeware|bedding|blanket|cushion|towel|mug|bottle|glass|kitchen)\b/i,
  ],
  [
    "gifts-collectibles",
    /\b(memorabilia|signed|toy|game|book|poster|coin|magnet|keyring|collectible|gift)\b/i,
  ],
  [
    "accessories",
    /\b(accessor|bag|cap|hat|scarf|glove|wallet|watch|jewelry|jewellery|ball|backpack|tie|pen|notebook|station)\b/i,
  ],
  [
    "clothing",
    /\b(tee|t-shirt|shirt|hoodie|sweatshirt|short|pant|jacket|polo|tracksuit|sock|swimwear|nightwear|baby|clothing|apparel|top)\b/i,
  ],
];

export function normalizeCategory(...values) {
  const haystack = values.filter(Boolean).join(" ");
  return (
    CATEGORY_RULES.find(([, pattern]) => pattern.test(haystack))?.[0] || "other"
  );
}

export async function scanBarcelona({
  fetchImpl = fetch,
  baseUrl = "https://store.fcbarcelona.com/en-us",
  limit = 250,
} = {}) {
  const products = [];
  let page = 1;
  for (; page <= 50; page += 1) {
    const url = `${baseUrl}/collections/all/products.json?limit=${limit}&page=${page}`;
    const response = await fetchPage(fetchImpl, url);
    const value = await response.json().catch(() => null);
    if (!Array.isArray(value?.products))
      throw new Error(
        `Barcelona catalog returned an invalid product response on page ${page}.`,
      );
    for (const product of value.products)
      products.push(normalizeBarcelonaProduct(product, baseUrl));
    if (value.products.length < limit) break;
  }
  if (page > 50)
    throw new Error("Barcelona catalog exceeded the 50-page safety limit.");
  return validateScan({ source: "barcelona", pageCount: page, products });
}

export function normalizeBarcelonaProduct(
  product,
  baseUrl = "https://store.fcbarcelona.com/en-us",
) {
  const sourceProductId = String(product?.id || "").trim();
  const handle = String(product?.handle || "").trim();
  const title = String(product?.title || "").trim();
  if (!sourceProductId || !handle || !title)
    throw new Error("Barcelona product is missing an ID, handle, or title.");
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const selectedVariant =
    variants.find((variant) => variant.available !== false) ||
    variants[0] ||
    {};
  return {
    availability: variants.length
      ? variants.some((variant) => variant.available !== false)
        ? "in_stock"
        : "out_of_stock"
      : "unknown",
    canonicalUrl: `${baseUrl.replace(/\/$/, "")}/products/${encodeURIComponent(handle)}`,
    category: normalizeCategory(product.product_type, product.tags, title),
    currency: String(selectedVariant.currency || "USD").toUpperCase(),
    id: `barcelona:${sourceProductId}`,
    imageUrl: cleanImage(product.image?.src || product.images?.[0]?.src),
    priceMinor: moneyToMinor(selectedVariant.price),
    source: "barcelona",
    sourceMetadata: {
      handle,
      productType: product.product_type || null,
      publishedAt: product.published_at || null,
    },
    sourceProductId,
    team: "barcelona",
    title,
  };
}

export async function scanArsenal({
  fetchImpl = fetch,
  baseUrl = "https://arsenaldirect.arsenal.com",
  concurrency = 3,
} = {}) {
  const robotsResponse = await fetchPage(fetchImpl, `${baseUrl}/robots.txt`);
  const robots = await robotsResponse.text();
  if (robotsDisallowsAll(robots))
    throw new Error(
      "Arsenal robots policy disallows automated catalog access.",
    );
  const sitemapUrls = await collectSitemapUrls(
    fetchImpl,
    `${baseUrl}/sitemap.xml`,
    baseUrl,
  );
  const productUrls = [
    ...new Set(
      sitemapUrls.filter((url) => /\/p\/[^/?#]+(?:[?#]|$)/i.test(url)),
    ),
  ];
  if (!productUrls.length)
    throw new Error("Arsenal sitemap did not expose product URLs.");
  const products = await mapWithConcurrency(
    productUrls,
    concurrency,
    async (url) => {
      const response = await fetchPage(fetchImpl, url);
      return normalizeArsenalProduct(url, await response.text());
    },
  );
  return validateScan({
    source: "arsenal",
    pageCount: sitemapUrls.length,
    products,
  });
}

export function normalizeArsenalProduct(url, html) {
  const code = decodeURIComponent(
    new URL(url).pathname.match(/\/p\/([^/]+)/i)?.[1] || "",
  ).trim();
  const records = [
    ...String(html).matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].flatMap((match) => parseJsonLd(match[1]));
  const product = records.find(
    (record) =>
      record?.["@type"] === "Product" ||
      (Array.isArray(record?.["@type"]) && record["@type"].includes("Product")),
  );
  const title = String(product?.name || "").trim();
  if (!code || !title)
    throw new Error(`Arsenal product metadata was incomplete for ${url}.`);
  const offers = Array.isArray(product.offers)
    ? product.offers[0]
    : product.offers || {};
  const availability = /InStock/i.test(String(offers.availability || ""))
    ? "in_stock"
    : /OutOfStock|SoldOut/i.test(String(offers.availability || ""))
      ? "out_of_stock"
      : "unknown";
  const image = Array.isArray(product.image) ? product.image[0] : product.image;
  return {
    availability,
    canonicalUrl: new URL(url).href,
    category: normalizeCategory(product.category, title),
    currency: String(offers.priceCurrency || "GBP").toUpperCase(),
    id: `arsenal:${code}`,
    imageUrl: cleanImage(typeof image === "object" ? image.url : image),
    priceMinor: moneyToMinor(offers.price),
    source: "arsenal",
    sourceMetadata: { productCode: code },
    sourceProductId: code,
    team: "arsenal",
    title,
  };
}

export function validateScan(scan) {
  if (!Array.isArray(scan.products) || !scan.products.length)
    throw new Error(`${scan.source} scan returned no products.`);
  const ids = new Set();
  for (const product of scan.products) {
    if (
      !product.id ||
      !product.sourceProductId ||
      !product.title ||
      !product.canonicalUrl
    )
      throw new Error(`${scan.source} scan returned an incomplete product.`);
    if (ids.has(product.id))
      throw new Error(
        `${scan.source} scan returned duplicate product ID ${product.id}.`,
      );
    ids.add(product.id);
  }
  return { ...scan, complete: true, scope: "full-store" };
}

async function collectSitemapUrls(fetchImpl, url, baseUrl, seen = new Set()) {
  if (seen.has(url) || seen.size >= 50) return [];
  seen.add(url);
  const response = await fetchPage(fetchImpl, url);
  const xml = await response.text();
  const locations = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) =>
    decodeXml(match[1].trim()),
  );
  const nested = locations.filter(
    (location) => /sitemap/i.test(location) && !/\/p\//i.test(location),
  );
  if (!nested.length)
    return locations.map((location) => new URL(location, baseUrl).href);
  const results = [];
  for (const nestedUrl of nested)
    results.push(
      ...(await collectSitemapUrls(
        fetchImpl,
        new URL(nestedUrl, baseUrl).href,
        baseUrl,
        seen,
      )),
    );
  return results;
}

async function fetchPage(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: {
      Accept:
        "application/json,text/html,application/xml,text/xml;q=0.9,*/*;q=0.8",
      "User-Agent":
        "BoxThisLapMerchandiseDiscovery/1.0 (+https://wyattjones-wnc.github.io/boxthislap/)",
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      `${new URL(url).hostname} returned ${response.status} for ${new URL(url).pathname}.`,
    );
  return response;
}

function parseJsonLd(value) {
  try {
    const parsed = JSON.parse(value.replace(/&quot;/g, '"'));
    const values = Array.isArray(parsed) ? parsed : [parsed];
    return values.flatMap((entry) =>
      Array.isArray(entry?.["@graph"]) ? entry["@graph"] : [entry],
    );
  } catch {
    return [];
  }
}
function robotsDisallowsAll(value) {
  const blocks = String(value).split(/(?=^User-agent:)/gim);
  return blocks.some(
    (block) =>
      /^User-agent:\s*\*/im.test(block) && /^Disallow:\s*\/$/im.test(block),
  );
}
function moneyToMinor(value) {
  const number = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}
function cleanImage(value) {
  const url = String(value || "").trim();
  return url ? (url.startsWith("//") ? `https:${url}` : url) : null;
}
function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}
async function mapWithConcurrency(values, concurrency, callback) {
  const results = new Array(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next++;
      results[index] = await callback(values[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker),
  );
  return results;
}
