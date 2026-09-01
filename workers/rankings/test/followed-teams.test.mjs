import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSubmittedTeamIds, resolveFollowedTeamRows } from "../src/index.js";

test("followed team order is preserved", () => {
  assert.deepEqual(normalizeSubmittedTeamIds(["arsenal", "atlanta-united"]), ["arsenal", "atlanta-united"]);
});

test("duplicate followed teams are rejected", () => {
  assert.throws(() => normalizeSubmittedTeamIds(["arsenal", "arsenal"]), /only be followed once/i);
});

test("followed team writes enforce the safety limit", () => {
  assert.throws(() => normalizeSubmittedTeamIds(Array.from({ length: 101 }, (_, index) => `team-${index}`)), /up to 100/i);
});

test("managers without choices inherit the admin team order", () => {
  const defaults = [{ team_id: "1", priority: 1 }, { team_id: "2", priority: 2 }];
  assert.deepEqual(resolveFollowedTeamRows([], defaults, "9", "6"), { rows: defaults, usingDefault: true });
});

test("personal choices replace defaults and the admin never falls back to itself", () => {
  const choices = [{ team_id: "3", priority: 1 }];
  const defaults = [{ team_id: "1", priority: 1 }];
  assert.deepEqual(resolveFollowedTeamRows(choices, defaults, "9", "6"), { rows: choices, usingDefault: false });
  assert.deepEqual(resolveFollowedTeamRows([], defaults, "6", "6"), { rows: [], usingDefault: false });
});
