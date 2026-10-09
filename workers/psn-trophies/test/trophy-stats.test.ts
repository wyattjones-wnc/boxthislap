import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { createTrophyStatsController, selectRareEarned } from "../../../modules/trophyStats.js";

const trophies = [0.1, 0.1, 0.2, 0.5, 0.6, 1, 1.1, null].map((earnedRate, index) => ({
  earnedRate, name: `Trophy ${index}`, gameName: "Game", type: "bronze",
}));

test("rare earned ranges preserve ties and include the requested boundaries", () => {
  assert.deepEqual(selectRareEarned(trophies, "0.1").map((trophy) => trophy.earnedRate), [0.1, 0.1]);
  assert.deepEqual(selectRareEarned(trophies, "0.5").map((trophy) => trophy.earnedRate), [0.2, 0.5]);
  assert.deepEqual(selectRareEarned(trophies, "1").map((trophy) => trophy.earnedRate), [0.5, 0.6, 1]);
});

test("stats default to all 0.1% trophies and update the list using the dropdown", async () => {
  const dom = new JSDOM('<div id="trophy-stats-content"></div><p id="trophy-stats-updated"></p>', { url: "https://example.com" });
  const previous = { document: globalThis.document, localStorage: globalThis.localStorage, fetch: globalThis.fetch };
  Object.assign(globalThis, {
    document: dom.window.document,
    localStorage: dom.window.localStorage,
    fetch: async () => new Response(JSON.stringify({ rareEarned: trophies })),
  });
  try {
    const controller = createTrophyStatsController({ endpoint: "https://example.com" });
    await controller.load();
    const select = dom.window.document.querySelector("select")!;
    const list = dom.window.document.querySelector("[data-trophy-rare-list]")!;
    assert.equal(select.value, "0.1");
    assert.equal(list.querySelectorAll("article").length, 2);
    select.value = "1";
    select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    assert.equal(list.querySelectorAll("article").length, 3);
    assert.match(list.textContent!, /Trophy 3/);
    assert.doesNotMatch(list.textContent!, /Trophy 0/);
    controller.renderPage();
    assert.equal(dom.window.document.querySelector("select")!.value, "1");
  } finally {
    Object.assign(globalThis, previous);
    dom.window.close();
  }
});
