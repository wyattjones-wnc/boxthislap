import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const start = source.indexOf(
  '  view.weeklyForm?.addEventListener("click", (event) => {',
);
const end = source.indexOf(
  '  view.weeklyForm?.addEventListener("submit",',
  start,
);

test("opening the weekly editor uses saved data without fetching provider drivers", async () => {
  let click;
  let loads = 0;
  const feedback = [];
  const editing = new Set();
  runInNewContext(source.slice(start, end), {
    view: {
      weeklyForm: {
        addEventListener: (_, callback) => {
          click = callback;
        },
      },
    },
    formulaOneManagerWeeklySelectedRound: "1",
    formulaOneManagerWeeklyEditing: editing,
    isCurrentManagerAdmin: () => true,
    renderFormulaOneManagerWeeklyEntry: (value) => feedback.push(value),
    ensureFormulaOneAdminData: async () => {
      loads++;
    },
    ensureFormulaOneRoundDrivers: async () => {
      throw new Error("Provider unavailable");
    },
    getErrorMessage: (error) => error.message,
  });
  const event = { target: { closest: () => ({}) } };
  click(event);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(loads, 1);
  assert.equal(editing.has("2026:1"), true);
  assert.deepEqual(feedback, [undefined, undefined]);
  click(event);
  assert.equal(editing.has("2026:1"), false);
  assert.equal(loads, 1);
});
