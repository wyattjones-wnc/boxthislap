import assert from "node:assert/strict";
import test from "node:test";
import {
  arsenalListingImage,
  barcelonaPageImage,
  normalizeArsenalProduct,
  normalizeBarcelonaProduct,
  normalizeCategory,
  scanArsenal,
  scanBarcelona,
  validateScan,
} from "./catalog.mjs";

test("replaces Arsenal's generic coming-soon image with its product-code image", () => {
  assert.equal(
    arsenalListingImage(
      "https://cdn.media.amplience.net/i/ArsenalDirect/4903ComingSoon?$plpImagesMobile$",
      "U07060",
    ),
    "https://cdn.media.amplience.net/i/ArsenalDirect/u07060_f1?$810x810$&.jpg",
  );
  assert.equal(
    arsenalListingImage(
      "https://cdn.media.amplience.net/i/ArsenalDirect/a123_f.jpg",
      "A123",
    ),
    "https://cdn.media.amplience.net/i/ArsenalDirect/a123_f.jpg",
  );
});

test("normalizes Barcelona parent products and ignores size variants for identity", () => {
  const product = normalizeBarcelonaProduct({
    id: 42,
    handle: "home-shirt",
    title: "Home Jersey",
    product_type: "Jersey",
    image: { src: "//cdn.example/shirt.jpg" },
    variants: [
      { id: 1, price: "124.99", available: false },
      {
        id: 2,
        price: "99.99",
        compare_at_price: "124.99",
        available: true,
      },
    ],
  });
  assert.equal(product.id, "barcelona:42");
  assert.equal(product.category, "kits");
  assert.equal(product.priceMinor, 9999);
  assert.equal(product.regularPriceMinor, 12499);
  assert.equal(product.availability, "in_stock");
  assert.equal(product.imageUrl, "https://cdn.example/shirt.jpg");
});

test("does not treat configurable Barcelona parent products as sold out", () => {
  const product = normalizeBarcelonaProduct({
    id: 43,
    handle: "player-home-shirt",
    title: "Player Home Jersey",
    product_type: "Ficticious",
    variants: [{ price: "235.00", available: false }],
  });
  assert.equal(product.availability, "unknown");
});

test("Barcelona scanner paginates until a short page", async () => {
  const pages = [
    [
      {
        id: 1,
        handle: "one",
        title: "Cap",
        product_type: "Cap",
        variants: [{ price: "20", available: true }],
      },
    ],
    [],
  ];
  let calls = 0;
  const scan = await scanBarcelona({
    limit: 1,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ products: pages[calls++] }),
    }),
  });
  assert.equal(scan.products.length, 1);
  assert.equal(scan.pageCount, 2);
  assert.equal(scan.complete, true);
});

test("excludes synthetic Barcelona customization products without shortening pagination", async () => {
  const calls = [];
  const pages = [
    [
      { id: 1, product_type: "Ficticious" },
      { id: 2, tags: "KIT_AWAY, PRODUCTO_FICTICIO" },
      { id: 3, tags: ["PRODUCTO_FICTICIO"] },
    ],
    [
      {
        id: 4,
        handle: "jersey",
        title: "Away Jersey",
        tags: ["PRODUCTO_NO_FICTICIO"],
        image: { src: "https://cdn.example/jersey.jpg" },
      },
    ],
  ];
  const scan = await scanBarcelona({
    limit: 3,
    fetchImpl: async (url) => {
      calls.push(url);
      return { ok: true, json: async () => ({ products: pages.shift() }) };
    },
  });
  assert.deepEqual(
    scan.products.map((product) => product.id),
    ["barcelona:4"],
  );
  assert.equal(scan.pageCount, 2);
  assert.equal(calls.length, 2);
  assert.equal(scan.excludedProductCount, 3);
});

test("extracts a Barcelona product gallery preload", () => {
  assert.equal(
    barcelonaPageImage(`<link rel="icon" href="/favicon.png">
      <link href='//store.fcbarcelona.com/cdn/shop/files/jersey.png?v=1&amp;width=450'
        fetchpriority="high" as="image" rel="preload">`),
    "https://store.fcbarcelona.com/cdn/shop/files/jersey.png?v=1&width=450",
  );
  assert.equal(
    barcelonaPageImage('<link rel="preload" as="style" href="/base.css">'),
    null,
  );
});

test("Barcelona scanner enriches only missing images and tolerates page failures", async () => {
  const calls = [];
  const scan = await scanBarcelona({
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes("products.json")) {
        return {
          ok: true,
          json: async () => ({
            products: [
              { id: 1, handle: "custom", title: "Custom Jersey", images: [] },
              {
                id: 2,
                handle: "plain",
                title: "Plain Jersey",
                image: { src: "https://cdn.example/plain.jpg" },
              },
              {
                id: 3,
                handle: "unavailable",
                title: "Other Jersey",
                images: [],
              },
            ],
          }),
        };
      }
      if (url.endsWith("/unavailable")) return { ok: false, status: 503 };
      return {
        ok: true,
        text: async () =>
          '<link rel="preload" as="image" href="//cdn.example/custom.jpg">',
      };
    },
  });
  assert.equal(scan.products[0].imageUrl, "https://cdn.example/custom.jpg");
  assert.equal(scan.products[1].imageUrl, "https://cdn.example/plain.jpg");
  assert.equal(scan.products[2].imageUrl, null);
  assert.equal(scan.complete, true);
  assert.equal(calls.length, 3);
});

test("normalizes Arsenal JSON-LD using the product code", () => {
  const html = `<script type="application/ld+json">{"@type":"Product","name":"Arsenal Away Shirt","image":"https://cdn.example/a.jpg","category":"Kit","offers":{"price":"80.00","priceCurrency":"GBP","availability":"https://schema.org/InStock"}}</script>`;
  const product = normalizeArsenalProduct(
    "https://arsenaldirect.arsenal.com/kit/p/A123",
    html,
  );
  assert.equal(product.id, "arsenal:A123");
  assert.equal(product.priceMinor, 8000);
  assert.equal(product.category, "kits");
});

test("Arsenal scanner follows the bounded paginated product grid", async () => {
  const productGrid = (code, pages) =>
    `<div data-plp-pagination='{"numberOfPages":"${pages}"}'><a href="/Clothing/Home-Shirt-${code}/p/${code}?searchUrl=/search" title="Arsenal Home Shirt ${code}"><img src="https://cdn.example/${code}.jpg"><span class="">£80.00</span></a></div>`;
  const responses = new Map([
    ["https://arsenaldirect.arsenal.com/robots.txt", "User-agent: *\nAllow: /"],
    [
      "https://arsenaldirect.arsenal.com/search?text=*&page=0",
      productGrid("A123", 2),
    ],
    [
      "https://arsenaldirect.arsenal.com/search?text=*&page=1",
      productGrid("B456", 2),
    ],
  ]);
  const requested = [];
  const scan = await scanArsenal({
    fetchImpl: async (url) => {
      requested.push(String(url));
      return { ok: true, text: async () => responses.get(String(url)) || "" };
    },
  });
  assert.equal(scan.products.length, 2);
  assert.equal(scan.products[0].id, "arsenal:A123");
  assert.equal(scan.products[0].priceMinor, 8000);
  assert.equal(scan.products[0].currency, "GBP");
  assert.equal(scan.pageCount, 2);
  assert.equal(requested.filter((url) => url.includes("/search?")).length, 2);
});

test("Arsenal listing preserves current and struck-through sale prices", async () => {
  const grid = `<div data-plp-pagination='{"numberOfPages":"1"}'><a href="/Clothing/Sale-Shirt/p/A123" title="Arsenal Sale Shirt"><img src="https://cdn.example/a.jpg"><span class="line-through">$100.00</span><span class="text-red">$75.00</span></a></div>`;
  const scan = await scanArsenal({
    fetchImpl: async (url) => ({
      ok: true,
      text: async () =>
        String(url).endsWith("robots.txt") ? "User-agent: *\nAllow: /" : grid,
    }),
  });
  assert.equal(scan.products[0].priceMinor, 7500);
  assert.equal(scan.products[0].regularPriceMinor, 10000);
});

test("Arsenal scanner excludes ticketed tours without excluding merchandise named Tour", async () => {
  const grid = `<div data-plp-pagination='{"numberOfPages":"1"}'>
    <a href="/Tours-Matchday-category/Match-Day/tour/p/MATCHDAY-1" title="Match Day Tour"><span>$50.00</span></a>
    <a href="/Clothing/Arsenal-Golf-Tour-Polo/p/POLO-1" title="Arsenal Golf Tour Polo"><span>$75.00</span></a>
  </div>`;
  const scan = await scanArsenal({
    fetchImpl: async (url) => ({
      ok: true,
      text: async () =>
        String(url).endsWith("robots.txt") ? "User-agent: *\nAllow: /" : grid,
    }),
  });
  assert.deepEqual(
    scan.products.map((product) => product.id),
    ["arsenal:POLO-1"],
  );
});

test("Arsenal scanner accepts a catalog page containing only excluded tours", async () => {
  const grid = `<div data-plp-pagination='{"numberOfPages":"1"}'><a href="/Tours-Audio/Audio-Tour/tour/p/STADIUM" title="Audio Tour"><span>$30.00</span></a></div>`;
  await assert.rejects(
    scanArsenal({
      fetchImpl: async (url) => ({
        ok: true,
        text: async () =>
          String(url).endsWith("robots.txt") ? "User-agent: *\nAllow: /" : grid,
      }),
    }),
    /returned no products/,
  );
});

test("category normalization covers simple merchandise groups", () => {
  assert.equal(normalizeCategory("Nike Shoes"), "footwear");
  assert.equal(normalizeCategory("Signed memorabilia"), "gifts-collectibles");
  assert.equal(normalizeCategory("Mystery item"), "other");
});

test("scan validation rejects duplicate stable IDs", () => {
  const product = {
    id: "barcelona:1",
    sourceProductId: "1",
    title: "One",
    canonicalUrl: "https://example.com/one",
  };
  assert.throws(
    () => validateScan({ source: "barcelona", products: [product, product] }),
    /duplicate/,
  );
});
