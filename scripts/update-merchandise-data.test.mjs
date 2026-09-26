import assert from "node:assert/strict";
import test from "node:test";
import {
  productChanged,
  runMerchandiseUpdate,
  scanContentHash,
} from "./update-merchandise-data.mjs";

test("a blocked Arsenal scan does not prevent a healthy Barcelona scan", async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes("arsenaldirect"))
      return { ok: false, status: 403 };
    return {
      ok: true,
      json: async () => ({
        products: [
          {
            handle: "home-shirt",
            id: 7,
            image: { src: "https://cdn.example/home.jpg" },
            product_type: "Jersey",
            title: "Home Jersey",
            variants: [{ available: true, price: "99.99" }],
          },
        ],
      }),
    };
  };
  const report = await runMerchandiseUpdate({
    dryRun: true,
    fetchImpl,
    sources: ["arsenal", "barcelona"],
  });
  assert.equal(report.healthy, false);
  assert.equal(
    report.outcomes.find((outcome) => outcome.source === "arsenal")?.status,
    "failed",
  );
  assert.equal(
    report.outcomes.find((outcome) => outcome.source === "barcelona")
      ?.itemCount,
    1,
  );
});

test("catalog hashing ignores source order and unchanged products need no write", () => {
  const products = [
    {
      availability: "in_stock",
      canonicalUrl: "https://example.com/two",
      category: "kits",
      currency: "USD",
      id: "barcelona:2",
      imageUrl: null,
      priceMinor: 2000,
      sourceMetadata: { handle: "two" },
      title: "Two",
    },
    {
      availability: "unknown",
      canonicalUrl: "https://example.com/one",
      category: "other",
      currency: "USD",
      id: "barcelona:1",
      imageUrl: null,
      priceMinor: 1000,
      sourceMetadata: { handle: "one" },
      title: "One",
    },
  ];
  assert.equal(
    scanContentHash(products),
    scanContentHash([...products].reverse()),
  );
  const product = products[0];
  assert.equal(
    productChanged(
      {
        availability: product.availability,
        canonical_url: product.canonicalUrl,
        category: product.category,
        currency: product.currency,
        image_url: product.imageUrl,
        price_minor: product.priceMinor,
        source_metadata: JSON.stringify(product.sourceMetadata),
        title: product.title,
      },
      product,
    ),
    false,
  );
});
