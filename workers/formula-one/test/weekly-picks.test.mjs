import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker from "../src/index.js";

test("managers can submit and edit weekly picks before the deadline", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    for (const migration of [
      "0001_initial.sql",
      "0002_qualifying_comparisons.sql",
      "0005_result_constructors.sql",
      "0006_round_drivers.sql",
    ]) {
      db.exec(
        readFileSync(
          new URL(`../migrations/${migration}`, import.meta.url),
          "utf8",
        ),
      );
    }
    db.exec(
      `INSERT INTO f1_rounds (year, round, name, deadline_at) VALUES (2026, 1, 'Test GP', '2099-01-01T00:00:00Z');`,
    );
    for (const id of ["a", "b", "c", "d", "e"]) {
      db.prepare(
        "INSERT INTO f1_drivers (year, driver_id, display_name, constructor_name) VALUES (2026, ?, ?, 'Williams')",
      ).run(id, id);
    }
    const env = {
      AUTH_SERVICE: {
        fetch: async () => Response.json({ ok: true, managerId: "manager-1" }),
      },
      DB: {
        prepare(sql) {
          return {
            bind(...values) {
              return {
                first: async () => db.prepare(sql).get(...values) ?? null,
                all: async () => ({ results: db.prepare(sql).all(...values) }),
                run: async () => db.prepare(sql).run(...values),
              };
            },
          };
        },
        batch: async (statements) =>
          Promise.all(statements.map((statement) => statement.run())),
      },
    };
    const submit = (wildcardDriverId) =>
      worker.fetch(
        new Request("https://example.com/api/seasons/2026/rounds/1/picks/me", {
          method: "PUT",
          headers: {
            Authorization: "Bearer test",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p1DriverId: "a",
            p2DriverId: "b",
            p3DriverId: "c",
            wildcardDriverId,
          }),
        }),
        env,
      );
    for (const wildcard of ["d", "e"]) {
      const response = await submit(wildcard);
      assert.equal(response.status, 200, JSON.stringify(await response.json()));
      assert.equal(
        db.prepare("SELECT wildcard_driver_id FROM f1_weekly_entries").get()
          .wildcard_driver_id,
        wildcard,
      );
    }
    db.exec("UPDATE f1_rounds SET deadline_at = '2000-01-01T00:00:00Z'");
    assert.equal((await submit("d")).status, 409);
    assert.equal(
      db.prepare("SELECT wildcard_driver_id FROM f1_weekly_entries").get()
        .wildcard_driver_id,
      "e",
    );
  } finally {
    db.close();
  }
});
