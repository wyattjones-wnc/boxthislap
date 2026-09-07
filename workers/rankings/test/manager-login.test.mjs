import assert from "node:assert/strict";
import test from "node:test";
import { parseManagerPortalResponse } from "../src/index.js";

const acceptedLogin = {
  source: "boxthislap-manager-portal",
  ok: true,
  managerId: "6",
};

test("manager login accepts the Apps Script JSONP response", () => {
  assert.deepEqual(
    parseManagerPortalResponse(`boxThisLapWorkerLogin(${JSON.stringify(acceptedLogin)});`, "boxThisLapWorkerLogin"),
    acceptedLogin
  );
});

test("manager login remains compatible with a JSON response", () => {
  assert.deepEqual(parseManagerPortalResponse(JSON.stringify(acceptedLogin), "boxThisLapWorkerLogin"), acceptedLogin);
});

test("manager login rejects malformed or mismatched callback responses", () => {
  assert.equal(parseManagerPortalResponse("<html></html>", "boxThisLapWorkerLogin"), null);
  assert.equal(parseManagerPortalResponse(`otherCallback(${JSON.stringify(acceptedLogin)});`, "boxThisLapWorkerLogin"), null);
});
