import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../src/index.js";

function createEnvironment(t) {
  const database = new DatabaseSync(":memory:");
  t.after(() => database.close());
  for (const file of [
    "0001_initial.sql",
    "0002_source_match.sql",
    "0005_image_position.sql",
  ]) {
    database.exec(
      readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"),
    );
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

test("Next image positions survive create, edit, list, and history", async (t) => {
  const env = createEnvironment(t);
  const send = (method, path, body) =>
    worker.fetch(
      new Request(`https://next.test/api/items${path}`, {
        method,
        headers: {
          Authorization: "Bearer test",
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      env,
    );
  const created = await send("POST", "", {
    thing: "Test",
    date: "2099-01-01",
    priority: 5,
  });
  assert.equal(created.status, 201);
  const { item } = await created.json();
  assert.equal(item.imagePositionX, 50);
  assert.equal(item.imagePositionY, 50);
  const updated = await send("PATCH", `/${item.id}`, {
    ...item,
    imagePositionX: 20,
    imagePositionY: 80,
  });
  assert.equal(updated.status, 200);
  const { items } = await (await send("GET", "")).json();
  assert.equal(items[0].imagePositionX, 20);
  assert.equal(items[0].imagePositionY, 80);
  assert.deepEqual(
    {
      ...env.database
        .prepare(
          "SELECT image_position_x, image_position_y FROM next_item_history WHERE revision = 2",
        )
        .get(),
    },
    { image_position_x: 20, image_position_y: 80 },
  );
  for (const position of [-1, 101, "invalid"]) {
    const response = await send("POST", "", {
      ...item,
      imagePositionX: position,
    });
    assert.equal(response.status, 400);
  }
});
