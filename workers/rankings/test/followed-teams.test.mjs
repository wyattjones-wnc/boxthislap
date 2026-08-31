import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSubmittedTeamIds } from "../src/index.js";

test("followed team order is preserved", () => {
  assert.deepEqual(normalizeSubmittedTeamIds(["arsenal", "atlanta-united"]), ["arsenal", "atlanta-united"]);
});

test("duplicate followed teams are rejected", () => {
  assert.throws(() => normalizeSubmittedTeamIds(["arsenal", "arsenal"]), /only be followed once/i);
});

test("followed team writes enforce the safety limit", () => {
  assert.throws(() => normalizeSubmittedTeamIds(Array.from({ length: 101 }, (_, index) => `team-${index}`)), /up to 100/i);
});
