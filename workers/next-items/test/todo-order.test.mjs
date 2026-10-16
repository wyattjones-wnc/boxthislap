import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../src/index.js";

function createEnvironment(t) {
  const database = new DatabaseSync(":memory:");
  t.after(() => database.close());
  database.exec(
    readFileSync(
      new URL("../migrations/0004_todo_items.sql", import.meta.url),
      "utf8",
    ),
  );
  for (let id = 1; id <= 6; id += 1) {
    database
      .prepare("INSERT INTO todo_items (id, sort_order, name) VALUES (?, ?, ?)")
      .run(id, id, `Item ${id}`);
  }
  return {
    database,
    ADMIN_MANAGER_IDS: "admin",
    MANAGER_AUTH: {
      fetch: async () => Response.json({ ok: true, managerId: "admin" }),
    },
    DB: {
      prepare(sql) {
        let values = [];
        return {
          bind(...args) {
            values = args;
            return this;
          },
          async all() {
            return { results: database.prepare(sql).all(...values) };
          },
          async first() {
            return database.prepare(sql).get(...values) ?? null;
          },
          async run() {
            const result = database.prepare(sql).run(...values);
            return {
              success: true,
              meta: {
                changes: result.changes,
                last_row_id: result.lastInsertRowid,
              },
            };
          },
        };
      },
      async batch(statements) {
        database.exec("BEGIN");
        try {
          const results = [];
          for (const statement of statements)
            results.push(await statement.run());
          database.exec("COMMIT");
          return results;
        } catch (error) {
          database.exec("ROLLBACK");
          throw error;
        }
      },
    },
  };
}

async function editItem(env, id, order, changes = {}) {
  const existingResponse = await worker.fetch(
    new Request("https://next.test/api/todo-items"),
    env,
  );
  const { items } = await existingResponse.json();
  const existing = items.find((item) => item.id === String(id));
  const response = await worker.fetch(
    new Request(`https://next.test/api/todo-items/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...existing, order, ...changes }),
    }),
    env,
  );
  assert.equal(response.status, 200, await response.text());
}

function assertOrder(env, ids) {
  const rows = env.database
    .prepare(
      "SELECT id, sort_order FROM todo_items WHERE archived = 0 AND parent_id IS NULL ORDER BY sort_order, id",
    )
    .all();
  assert.deepEqual(
    rows.map((row) => row.id),
    ids,
  );
  assert.deepEqual(
    rows.map((row) => row.sort_order),
    ids.map((_, index) => index + 1),
  );
}

for (const [label, id, order, expected] of [
  ["move upward past unchanged ranks", 5, 3, [1, 2, 5, 3, 4, 6]],
  ["move downward past unchanged ranks", 2, 5, [1, 3, 4, 5, 2, 6]],
  ["move to first", 6, 1, [6, 1, 2, 3, 4, 5]],
  ["move to last", 1, 6, [2, 3, 4, 5, 6, 1]],
  ["keep the same rank", 3, 3, [1, 2, 3, 4, 5, 6]],
]) {
  test(`To Do edit: ${label}`, async (t) => {
    const env = createEnvironment(t);
    await editItem(env, id, order);
    assertOrder(env, expected);
    await editItem(env, id, order, { name: "Renamed" });
    assertOrder(env, expected);
  });
}

test("To Do edits compact ranks around archived items and nested children", async (t) => {
  const env = createEnvironment(t);
  env.database.exec(
    "UPDATE todo_items SET archived = 1, revision = revision + 1 WHERE id = 2; UPDATE todo_items SET parent_id = 1, revision = revision + 1 WHERE id = 3;",
  );
  await editItem(env, 5, 2);
  assertOrder(env, [1, 5, 4, 6]);
  const excluded = env.database
    .prepare(
      "SELECT id, sort_order FROM todo_items WHERE id IN (2, 3) ORDER BY id",
    )
    .all();
  assert.deepEqual(
    excluded.map((row) => [row.id, row.sort_order]),
    [
      [2, 2],
      [3, 3],
    ],
  );
});
