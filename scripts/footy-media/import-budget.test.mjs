import assert from "node:assert/strict";
import test from "node:test";
import { assertImportBudget } from "./import-budget.mjs";

test("accepts the nightly boundary without truncating galleries", () => {
  const galleries = Array.from({ length: 100 }, () => ({
    images: Array.from({ length: 15 }, () => ({ id: "image" })),
  }));
  assert.doesNotThrow(() => assertImportBudget(galleries));
  assert.equal(galleries.length, 100);
  assert.equal(galleries[0].images.length, 15);
});

test("rejects gallery and image overages before importing", () => {
  assert.throws(
    () =>
      assertImportBudget(Array.from({ length: 101 }, () => ({ images: [] }))),
    /No galleries were imported/,
  );
  assert.throws(
    () =>
      assertImportBudget([
        { images: Array.from({ length: 1501 }, () => ({})) },
      ]),
    /No galleries were imported/,
  );
});

test("bounds metadata by UTF-8 bytes", () => {
  assert.throws(
    () => assertImportBudget([{ images: [], title: "é".repeat(1_000_000) }]),
    /2 MB metadata import budget/,
  );
});
