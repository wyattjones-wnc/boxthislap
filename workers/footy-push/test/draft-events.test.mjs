import assert from "node:assert/strict";
import test from "node:test";
import worker, { sendDraftEvent } from "../src/index.js";

function environment() {
  const entries = new Map();
  for (const [hash, managerId, dev] of [
    ["a", "1", true],
    ["b", "1", true],
    ["c", "2", true],
    ["d", "1", false],
  ])
    entries.set(
      `sub:${hash}`,
      JSON.stringify({
        active: true,
        managerId,
        topics: { footy: true, "league-drafts": true },
        pageUrl: `https://wyattjones-wnc.github.io/boxthislap/${dev ? "dev/" : ""}`,
        endpoint: `https://push.example/${hash}`,
      }),
    );
  return {
    entries,
    FOOTY_PUSH_KV: {
      async get(key) {
        return entries.get(key) || null;
      },
      async put(key, value) {
        entries.set(key, value);
      },
      async delete(key) {
        entries.delete(key);
      },
      async list({ prefix }) {
        return {
          keys: [...entries.keys()]
            .filter((key) => key.startsWith(prefix))
            .map((name) => ({ name })),
          list_complete: true,
        };
      },
    },
    VAPID_PUBLIC_KEY: "test",
    VAPID_PRIVATE_KEY: "test",
    VAPID_SUBJECT: "mailto:test@example.com",
  };
}
const event = {
  id: "event-1",
  managerId: "1",
  environment: "dev",
  title: "Your turn",
  body: "Pick now",
  url: "https://wyattjones-wnc.github.io/boxthislap/dev/#fantasy-office-2027-draft?draft=draft-1",
};

test("draft event reaches all recipient devices on dev once, preserving unrelated pending alerts", async () => {
  const env = environment();
  env.entries.set(
    "pending:a",
    JSON.stringify([{ title: "Footy", tag: "existing" }]),
  );
  const calls = [];
  const send = async (subscription) => {
    calls.push(subscription.endpoint);
    return new Response(null, { status: 201 });
  };
  assert.equal((await sendDraftEvent(event, env, send)).sent, 2);
  assert.deepEqual(calls.sort(), [
    "https://push.example/a",
    "https://push.example/b",
  ]);
  assert.equal(JSON.parse(env.entries.get("pending:a")).length, 2);
  assert.equal((await sendDraftEvent(event, env, send)).sent, 0);
  assert.equal(calls.length, 2);
  assert.equal(JSON.parse(env.entries.get("sub:a")).topics.footy, true);
});

test("failed delivery remains retryable and expired device endpoints are removed", async () => {
  const env = environment();
  const result = await sendDraftEvent(
    event,
    env,
    async (subscription) =>
      new Response(null, {
        status: subscription.endpoint.endsWith("/a") ? 503 : 410,
      }),
  );
  assert.equal(result.failed, 1);
  assert.equal(env.entries.has("sub:b"), false);
  assert.equal(env.entries.has("sent:draft:event-1:a"), false);
  assert.equal(
    (
      await sendDraftEvent(
        event,
        env,
        async () => new Response(null, { status: 201 }),
      )
    ).sent,
    1,
  );
});

test("untrusted draft deliveries and incorrect environment URLs are rejected", async () => {
  const env = environment();
  const response = await worker.fetch(
    new Request("https://push.test/internal/draft-events", {
      method: "POST",
      body: JSON.stringify(event),
    }),
    env,
  );
  assert.equal(response.status, 401);
  await assert.rejects(
    sendDraftEvent({ ...event, url: event.url.replace("/dev/", "/") }, env),
    /invalid/,
  );
});
