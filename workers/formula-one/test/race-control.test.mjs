import test from "node:test";
import assert from "node:assert/strict";

import { deriveSafetyCarValue } from "../src/index.js";

test("does not count a VSC as a Safety Car deployment", () => {
  const result = deriveSafetyCarValue([
    { category: "SafetyCar", message: "VSC DEPLOYED" },
    { category: "SafetyCar", message: "VSC ENDING" },
    { category: "Other", message: "SAFETY CAR LIGHTS ON" },
  ]);
  assert.equal(result.value, "No");
  assert.equal(result.detail, "Virtual Safety Car only");
});

test("recognizes a physical Safety Car deployment", () => {
  const result = deriveSafetyCarValue([
    { category: "SafetyCar", message: "SAFETY CAR DEPLOYED" },
    { category: "SafetyCar", message: "SAFETY CAR IN THIS LAP" },
  ]);
  assert.equal(result.value, "Yes");
  assert.equal(result.detail, "Safety Car deployed");
});

test("returns No when the feed has no deployment", () => {
  const result = deriveSafetyCarValue([{ category: "Flag", message: "YELLOW FLAG" }]);
  assert.equal(result.value, "No");
  assert.equal(result.detail, "No Safety Car deployment");
});
