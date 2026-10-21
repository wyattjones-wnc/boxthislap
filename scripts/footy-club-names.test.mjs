import assert from "node:assert/strict";
import test from "node:test";
import { isSameFootballClubName, normalizeFootballClubName } from "./footy-club-names.mjs";

test("matches abbreviated Champions League club names across providers", () => {
  for (const [first, second] of [
    ["Lille", "Lille OSC"],
    ["Sabah", "Sabah FK"],
    ["Slavia Prague", "SK Slavia Praha"],
    ["Sporting CP", "Sporting Clube de Portugal"],
    ["Bayern Munich", "FC Bayern München"],
  ]) {
    assert.equal(isSameFootballClubName(first, second), true, `${first} should match ${second}`);
  }
});

test("uses the same fingerprint for Bayern provider aliases", () => {
  assert.equal(normalizeFootballClubName("FC Bayern München"), normalizeFootballClubName("Bayern Munich"));
  assert.equal(isSameFootballClubName("Bayern Munich", "Bayern München Women"), false);
  assert.equal(isSameFootballClubName("Bayern Munich", "TSV 1860 München"), false);
});

test("does not merge distinct clubs with a shared city or prefix", () => {
  assert.equal(isSameFootballClubName("Manchester City", "Manchester United"), false);
  assert.equal(isSameFootballClubName("Real Madrid", "Real Betis"), false);
});

test("matches United States national-team provider aliases", () => {
  assert.equal(isSameFootballClubName("USA", "United States"), true);
  assert.equal(isSameFootballClubName("USMNT", "USA"), true);
  assert.equal(isSameFootballClubName("USA Women", "United States Women"), true);
  assert.equal(isSameFootballClubName("USWNT", "USA Women"), true);
  assert.equal(isSameFootballClubName("USA Women", "United States"), false);
});
