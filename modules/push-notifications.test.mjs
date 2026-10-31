import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const worker = readFileSync(
  new URL("../service-worker.js", import.meta.url),
  "utf8",
);
const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const recovery = script.slice(
  script.indexOf("async function reconcileStoredPushNotificationTopics()"),
  script.indexOf("async function unsubscribeFootyPushNotifications()"),
);

for (const enabled of [
  [],
  ["footy"],
  ["formula-one"],
  ["footy", "formula-one"],
]) {
  test(`restores only saved enabled topics: ${enabled.join(",")}`, async () => {
    const calls = [];
    const context = vm.createContext({
      isFootyPushNotificationSupported: () => true,
      Notification: { permission: "granted" },
      getCurrentManagerId: () => "6",
      FOOTY_NOTIFICATION_STORAGE_KEY: "footy",
      FORMULA_ONE_NOTIFICATION_STORAGE_KEY: "formula-one",
      getStoredBoolean: (key) => enabled.includes(key),
      subscribeFootyPushNotifications: async (topic) => {
        calls.push(topic);
        if (topic === "footy") throw new Error("offline");
      },
      recordDiagnostic() {},
    });
    await vm.runInContext(
      `${recovery}\nreconcileStoredPushNotificationTopics()`,
      context,
    );
    assert.deepEqual(calls, enabled);
  });
}

for (const mode of [
  "empty",
  "offline",
  "invalid-json",
  "http-error",
  "missing-subscription",
  "details",
]) {
  test(`push stays visible when receiving ${mode}`, async () => {
    let listener;
    const shown = [];
    vm.runInNewContext(worker, {
      URL,
      self: {
        location: { origin: "https://example.test" },
        registration: {
          scope: "https://example.test/dev/",
          pushManager: {
            getSubscription: async () =>
              mode === "missing-subscription"
                ? null
                : { endpoint: "https://push.test/device" },
          },
          showNotification: async (title, options) =>
            shown.push({ title, ...options }),
        },
        addEventListener: (name, fn) => {
          if (name === "push") listener = fn;
        },
      },
      caches: { open: async () => ({ match: async () => null }) },
      fetch: async () => {
        if (mode === "offline") throw new Error("offline");
        return {
          ok: mode !== "http-error",
          json: async () => {
            if (mode === "invalid-json") throw new SyntaxError("invalid JSON");
            return {
              notifications:
                mode === "details"
                  ? [
                      {
                        title: "Kickoff",
                        body: "Match starts now",
                        tag: "box-this-lap-footy-1",
                      },
                    ]
                  : [],
            };
          },
        };
      },
    });
    let pending;
    listener({
      waitUntil: (promise) => {
        pending = promise;
      },
    });
    await pending;
    assert.equal(shown.length, 1);
    assert.equal(
      shown[0].title,
      mode === "details" ? "Kickoff" : "Box This Lap",
    );
    assert.equal(shown[0].data.url, mode === "details" ? "./#footy" : "./");
  });
}
