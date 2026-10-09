import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("service worker suppresses other managers draft alerts after account switch and signout without suppressing Footy", async () => {
  const listeners = new Map();
  const stored = new Map();
  const shown = [];
  const closed = [];
  const notifications = [
    {
      title: "Your turn one",
      tag: "box-this-lap-draft-one",
      managerId: "1",
      url: "https://example.test/#draft-one",
    },
    {
      title: "Your turn two",
      tag: "box-this-lap-draft-two",
      managerId: "2",
      url: "https://example.test/#draft-two",
    },
    {
      title: "Footy",
      tag: "box-this-lap-footy-match",
      url: "https://example.test/#footy",
    },
  ];
  const registration = {
    scope: "https://example.test/dev/",
    pushManager: {
      async getSubscription() {
        return { endpoint: "https://push.test/device" };
      },
    },
    async showNotification(title, options) {
      shown.push({ title, ...options });
    },
    async getNotifications() {
      return ["1", "2"].map((managerId) => ({
        tag: `box-this-lap-draft-${managerId}`,
        data: { managerId },
        close() {
          closed.push(managerId);
        },
      }));
    },
  };
  vm.runInNewContext(
    await readFile(
      new URL("../../../service-worker.js", import.meta.url),
      "utf8",
    ),
    {
      URL,
      Response,
      self: {
        location: { origin: "https://example.test" },
        registration,
        addEventListener(type, listener) {
          listeners.set(type, listener);
        },
      },
      caches: {
        async open(name) {
          return {
            async put(key, value) {
              stored.set(`${name}:${key}`, await value.text());
            },
            async match(key) {
              const value = stored.get(`${name}:${key}`);
              return value === undefined ? undefined : new Response(value);
            },
          };
        },
      },
      async fetch() {
        return Response.json({ notifications });
      },
    },
  );
  async function emit(type, data) {
    let operation;
    listeners.get(type)({
      data,
      waitUntil(promise) {
        operation = promise;
      },
    });
    await operation;
  }
  await emit("message", { type: "DRAFT_MANAGER", managerId: "2" });
  assert.deepEqual(closed, ["1"]);
  await emit("push");
  assert.deepEqual(
    shown.map((notification) => notification.title),
    ["Your turn two", "Footy"],
  );
  shown.length = 0;
  await emit("message", { type: "DRAFT_MANAGER", managerId: "" });
  await emit("push");
  assert.deepEqual(
    shown.map((notification) => notification.title),
    ["Footy"],
  );
});
