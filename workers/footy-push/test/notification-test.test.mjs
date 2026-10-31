import assert from "node:assert/strict";
import test from "node:test";
import { sendTestNotification } from "../src/index.js";

async function setup(manager = "6", owner = "6", topicEnabled = true) {
  const secret = "test-secret";
  const encoded = Buffer.from(
    JSON.stringify({
      sub: manager,
      typ: "access",
      exp: Math.floor(Date.now() / 1000) + 60,
    }),
  ).toString("base64url");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = Buffer.from(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded)),
  ).toString("base64url");
  const endpoint = "https://push.test/device";
  const hash = Buffer.from(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint)),
  )
    .toString("base64url")
    .slice(0, 32);
  const entries = new Map([
    [
      `sub:${hash}`,
      JSON.stringify({
        active: true,
        managerId: owner,
        endpoint,
        topics: {
          footy: topicEnabled,
          "formula-one": true,
          "league-drafts": true,
        },
        pageUrl: "https://wyattjones-wnc.github.io/boxthislap/dev/",
      }),
    ],
    [
      `pending:${hash}`,
      JSON.stringify([{ title: "Existing", tag: "existing" }]),
    ],
  ]);
  const env = {
    AUTH_SECRET: secret,
    ADMIN_MANAGER_IDS: "6",
    DEV_NOTIFICATION_URL:
      "https://wyattjones-wnc.github.io/boxthislap/dev/#footy",
    FOOTY_PUSH_KV: {
      get: async (key) => entries.get(key) || null,
      put: async (key, value) => {
        entries.set(key, value);
      },
      delete: async (key) => {
        entries.delete(key);
      },
    },
  };
  const request = (topic = "footy") =>
    new Request("https://worker.test/test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${encoded}.${signature}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint, topic }),
    });
  return { env, entries, hash, request };
}

test("admin test sends to one owned device, preserves pending alerts and observes cooldown", async () => {
  const { env, entries, hash, request } = await setup();
  let sent = 0;
  const send = async (record) => {
    assert.equal(record.managerId, "6");
    sent++;
    return { ok: true };
  };
  assert.equal(
    (await sendTestNotification(request(), env, send)).accepted,
    true,
  );
  const pending = JSON.parse(entries.get(`pending:${hash}`));
  assert.equal(pending.length, 2);
  assert.equal(pending[0].title, "Existing");
  assert.equal(pending[1].title, "Footy notification test");
  assert.match(pending[1].url, /\/dev\/#footy$/);
  await assert.rejects(sendTestNotification(request(), env, send), {
    status: 429,
  });
  assert.equal(sent, 1);
});
for (const [manager, owner, enabled, status] of [
  ["7", "7", true, 403],
  ["6", "7", true, 404],
  ["6", "6", false, 400],
]) {
  test(`rejects unauthorized or disabled test: ${manager}/${owner}/${enabled}`, async () => {
    const { env, request } = await setup(manager, owner, enabled);
    await assert.rejects(
      sendTestNotification(request(), env, () => assert.fail("must not send")),
      { status },
    );
  });
}
test("expired subscriptions are removed and reported for recovery", async () => {
  const { env, request, entries, hash } = await setup();
  await assert.rejects(
    sendTestNotification(request(), env, async () => ({
      ok: false,
      status: 410,
    })),
    { status: 410 },
  );
  assert.equal(entries.has(`sub:${hash}`), false);
});
for (const topic of ["formula-one", "league-drafts"]) {
  test(`supports ${topic} tests`, async () => {
    const { env, request, entries, hash } = await setup();
    await sendTestNotification(request(topic), env, async () => ({ ok: true }));
    assert.match(
      JSON.parse(entries.get(`pending:${hash}`))[1].title,
      /notification test$/,
    );
  });
}
