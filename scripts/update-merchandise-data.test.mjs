import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBaselineSql,
  productChanged,
  runMerchandiseUpdate,
  scanContentHash,
} from "./update-merchandise-data.mjs";

test("baseline SQL preserves unseen state and safely escapes catalog data", () => {
  const sql = buildBaselineSql(
    {
      pageCount: 1,
      products: [
        {
          availability: "in_stock",
          canonicalUrl: "https://example.com/shirt",
          category: "kits",
          currency: "USD",
          id: "barcelona:1",
          imageUrl: null,
          priceMinor: 10000,
          source: "barcelona",
          sourceMetadata: { handle: "manager-shirt" },
          sourceProductId: "1",
          team: "barcelona",
          title: "Manager's Shirt",
        },
      ],
      source: "barcelona",
    },
    "2026-09-26T12:00:00.000Z",
  );
  assert.match(sql, /Manager''s Shirt/);
  assert.match(sql, /new_since, in_scope/);
  assert.match(sql, /NULL, 1/);
  assert.match(sql, /content_hash/);
});

test("default scans include Arsenal and continue to Barcelona when Arsenal is blocked", async () => {
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
    env: {},
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

test("sale transitions reset seen for every manager once and preserve wishlists", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { readFile } = await import("node:fs/promises");
  const { importScan } = await import("./update-merchandise-data.mjs");
  const db = new DatabaseSync(":memory:");
  try {
    for (const migration of [
      "1101_merchandise_initial.sql",
      "1102_merchandise_sale_prices.sql",
    ])
      db.exec(
        await readFile(
          new URL(
            `../workers/merchandise/migrations/${migration}`,
            import.meta.url,
          ),
          "utf8",
        ),
      );
    const product = {
      id: "barcelona:1",
      source: "barcelona",
      sourceProductId: "1",
      team: "barcelona",
      title: "Shirt",
      canonicalUrl: "https://example.com/shirt",
      imageUrl: null,
      category: "kits",
      priceMinor: 10000,
      currency: "EUR",
      availability: "in_stock",
    };
    const d1 = {
      async rows(sql, params) {
        return db.prepare(sql).all(...params);
      },
      async batch(statements) {
        db.exec("BEGIN");
        try {
          for (const { sql, params } of statements)
            db.prepare(sql).run(...params);
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
    };
    let scanNumber = 0;
    const scan = () =>
      importScan(d1, {
        baseline: false,
        contentHash: scanContentHash([product]),
        id: String(++scanNumber),
        scan: { products: [product], pageCount: 1 },
        source: "barcelona",
        startedAt: "2026-10-19",
      });
    await scan();
    for (const manager of ["6", "8"])
      db.prepare(
        "INSERT INTO merch_manager_state VALUES (?, ?, 'seen', 'wishlist', 'before')",
      ).run(manager, product.id);
    const states = () =>
      db
        .prepare("SELECT seen_at, wishlisted_at FROM merch_manager_state")
        .all();
    product.title = "Updated shirt";
    await scan();
    assert.ok(states().every((state) => state.seen_at === "seen"));
    product.priceMinor = 8000;
    product.regularPriceMinor = 10000;
    await scan();
    assert.ok(
      states().every(
        (state) => state.seen_at === null && state.wishlisted_at === "wishlist",
      ),
    );
    assert.equal(
      db.prepare("SELECT regular_price_minor FROM merch_products").get()
        .regular_price_minor,
      10000,
    );
    db.exec("UPDATE merch_manager_state SET seen_at = 'seen again'");
    await scan();
    product.priceMinor = 7000;
    await scan();
    assert.ok(states().every((state) => state.seen_at === "seen again"));
    product.regularPriceMinor = null;
    await scan();
    product.regularPriceMinor = 10000;
    await scan();
    assert.ok(states().every((state) => state.seen_at === null));
  } finally {
    db.close();
  }
});

test("sale price changes affect hashing and product change detection", () => {
  const product = { id: "barcelona:1", priceMinor: 8000 };
  assert.notEqual(
    scanContentHash([product]),
    scanContentHash([{ ...product, regularPriceMinor: 10000 }]),
  );
});
