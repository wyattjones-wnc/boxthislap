import assert from "node:assert/strict";
import test from "node:test";
import { parseCatalogIndex, parseHomepageCategories, parseHotWheels2001 } from "./brianzpatton.mjs";

test("discovers image-map homepage categories", () => {
  const categories = parseHomepageCategories(`<map><area href="https://brianzpatton.com/HotWheels/index.html"><area href="/Prototypes/index.html"><area href="/Errors/index.html"></map>`);
  assert.deepEqual(categories.map((category) => [category.slug, category.checklistMode]), [
    ["hot-wheels", "normal"],
    ["prototypes", "optional"],
    ["errors", "reference_only"],
  ]);
});

test("groups the two 50584 Grave Digger Grain variants", () => {
  const html = `<td><a href="grain.htm"><img src="grain.jpg"></a><strong><br>Grave Digger Grain</strong></td>
    <strong>2001 1:64 HOT WHEELS MONSTER TRUCK LIST<br><br>
    50584 Grave Digger Grain Blue<br>50584 Grave Digger Grain Purple<br><br>
    2001 1:43 HOT WHEELS MONSTER JAM</strong>`;
  const items = parseHotWheels2001(html, { groups: [{ sourceKeys: ["hot-wheels:2001:1-64:50584:grave-digger-grain-blue"], canonicalName: "Grave Digger Grain" }] });
  assert.equal(items.length, 1);
  assert.equal(items[0].name, "Grave Digger Grain");
  assert.deepEqual(items[0].variants.map((variant) => variant.variantName), ["Blue", "Purple"]);
});

test("discovers nested indexes and parses catalog cards", () => {
  const html = `<a href="../2025/index.html"><img src="year.png"></a><td><a href="2024 Mix C Bigfoot.html"><img src="SM-Bigfoot.jpg"></a><br>Bigfoot<br>Mix C Package</td>`;
  const parsed = parseCatalogIndex(html, "https://www.brianzpatton.com/HotWheels/2024/index.html", "hot-wheels");
  assert.deepEqual(parsed.indexUrls, ["https://www.brianzpatton.com/HotWheels/2025/index.html"]);
  assert.equal(parsed.cards.length, 1);
  assert.equal(parsed.cards[0].name, "Bigfoot Mix C Package");
  assert.equal(parsed.cards[0].year, 2024);
  assert.equal(parsed.cards[0].mix, "Mix C");
  assert.equal(parsed.cards[0].manufacturerSlug, "hot-wheels");
});
