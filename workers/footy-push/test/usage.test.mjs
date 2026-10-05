import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";

function environment(records = []) {
  return {
    DB: {},
    FOOTY_PUSH_KV: {
      async list() { return { keys: records.map((_, index) => ({ name: `sub:${index}` })) }; },
      async get(key) { return JSON.stringify(records[Number(key.slice(4))]); },
    },
    FOOTY_SCHEDULE_URL: "https://example.com/schedule.json",
    VAPID_PUBLIC_KEY: "test",
    VAPID_PRIVATE_KEY: "test",
    VAPID_SUBJECT: "mailto:test@example.com",
    FORMULA_ONE_DB: { prepare() { assert.fail("Unsubscribed Formula One data must not be read"); } },
  };
}

test("empty push subscriptions skip schedule fetches and database reads", async (context) => {
  context.mock.method(globalThis, "fetch", () => assert.fail("No schedule fetch is needed"));
  const response = await worker.fetch(new Request("https://example.com/run", { method: "POST" }), environment());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).dueAlerts, 0);
});

test("Footy-only subscribers do not query Formula One rounds", async (context) => {
  const fetchMock = context.mock.method(globalThis, "fetch", async () => Response.json({ teamSchedules: [] }));
  const response = await worker.fetch(new Request("https://example.com/run", { method: "POST" }), environment([
    { active: true, endpoint: "https://example.com/push", topics: { footy: true, "formula-one": false } },
  ]));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).dueAlerts, 0);
  assert.equal(fetchMock.mock.callCount(), 1);
});
