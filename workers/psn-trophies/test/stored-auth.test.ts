import assert from "node:assert/strict";
import test from "node:test";
import { getPsnNpsso, savePsnNpsso } from "../src/psn/stored-auth.ts";

test("encrypts a webpage-updated NPSSO and decrypts it for synchronization", async () => {
  const clear = "a".repeat(64);
  let stored: { cipher_text: string; iv: string } | null = null;
  const env = {
    PSN_AUTH_ENCRYPTION_KEY: btoa("0123456789abcdef0123456789abcdef"),
    DB: {
      batch: async () => [],
      prepare: (query: string) => ({
        bind: (...values: unknown[]) => ({
          run: async () => {
            stored = { cipher_text: String(values[0]), iv: String(values[1]) };
            return { success: true };
          },
        }),
        first: async () => query.startsWith("SELECT cipher_text") ? stored : null,
      }),
    },
  } as any;

  await savePsnNpsso(env, clear, "6");
  assert.ok(stored);
  assert.notEqual(stored.cipher_text, clear);
  assert.equal(await getPsnNpsso(env), clear);
});
