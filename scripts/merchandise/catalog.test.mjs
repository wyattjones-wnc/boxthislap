import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeArsenalProduct,
  normalizeBarcelonaProduct,
  normalizeCategory,
  scanBarcelona,
  validateScan,
} from "./catalog.mjs";

test("normalizes Barcelona parent products and ignores size variants for identity", () => {
  const product = normalizeBarcelonaProduct({
    id: 42,
    handle: "home-shirt",
    title: "Home Jersey",
    product_type: "Jersey",
    image: { src: "//cdn.example/shirt.jpg" },
    variants: [
      { id: 1, price: "124.99", available: false },
      { id: 2, price: "124.99", available: true },
    ],
  });
  assert.equal(product.id, "barcelona:42");
  assert.equal(product.category, "kits");
  assert.equal(product.priceMinor, 12499);
  assert.equal(product.availability, "in_stock");
  assert.equal(product.imageUrl, "https://cdn.example/shirt.jpg");
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
