import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { addItem } from "../src/index.js";

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../migrations/0001_initial.sql", import.meta.url), "utf8"));
  const env = { DB: {
    prepare(sql) {
      return { bind(...args) { return {
        first: async () => db.prepare(sql).get(...args),
        all: async () => ({ results: db.prepare(sql).all(...args) }),
        run: () => db.prepare(sql).run(...args),
      }; } };
    },
    async batch(statements) {
      db.exec("BEGIN");
      try { for (const statement of statements) statement.run(); db.exec("COMMIT"); }
      catch (error) { db.exec("ROLLBACK"); throw error; }
    },
  } };
  return { db, env };
}

for (const type of ["games", "movies", "tv"]) {
  test(`adding a ${type} item snapshots calculated order and normalizes atomically`, async () => {
    const { db, env } = database();
    try {
      const insert = db.prepare("INSERT INTO ranking_items (manager_id, ranking_type, item_id, name, manual_rank, archived) VALUES (?, ?, ?, ?, ?, ?)");
      insert.run("6", type, "a", "Alpha", 1, 0);
      insert.run("6", type, "b", "Beta", 2, 0);
      insert.run("6", type, "old", "Archived", 3, 1);
      insert.run("8", type, "other", "Other manager", 1, 0);
      db.prepare("INSERT INTO ranking_elo (manager_id, ranking_type, item_id, rating, wins, losses) VALUES ('6', ?, 'b', 1700, 3, 1)").run(type);
      db.prepare("INSERT INTO ranking_choices (choice_id, manager_id, ranking_type, item_a_id, item_b_id, winner_id, loser_id) VALUES ('choice', '6', ?, 'a', 'b', 'b', 'a')").run(type);
      const result = await addItem(env, "6", type, { name: "New", manualRank: 2, revision: 0 });
      assert.equal(result.revision, 1);
      const snapshots = db.prepare("SELECT * FROM ranking_snapshot_items ORDER BY rank").all();
      assert.deepEqual(snapshots.map(row => [row.item_id, row.rating, row.wins, row.losses]), [["b", 1700, 3, 1], ["a", 1500, 0, 0]]);
      assert.ok(snapshots.every(row => row.snapshot_id === result.snapshotId));
      const elo = db.prepare("SELECT * FROM ranking_elo ORDER BY rating DESC").all();
      assert.deepEqual(elo.map(row => [row.item_id, row.rating, row.wins, row.losses]), [["b", 1508, 0, 0], [result.item.id, 1500, 0, 0], ["a", 1492, 0, 0]]);
      assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ranking_choices").get().n, 0);
      assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ranking_items WHERE manager_id = '8'").get().n, 1);
      await assert.rejects(addItem(env, "6", type, { name: "Stale", revision: 0 }), /another session/);
      assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ranking_snapshots").get().n, 1);
    } finally { db.close(); }
  });
}

test("the first item starts at base rating without an empty snapshot", async () => {
  const { db, env } = database();
  try {
    const result = await addItem(env, "6", "games", { name: "First", manualRank: 1, revision: 0 });
    assert.equal(result.snapshotId, null);
    assert.equal(db.prepare("SELECT rating FROM ranking_elo").get().rating, 1500);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ranking_snapshots").get().n, 0);
  } finally { db.close(); }
});

test("a failed addition rolls back the snapshot, normalization, and revision", async () => {
  const { db, env } = database();
  try {
    await addItem(env, "6", "games", { name: "First", revision: 0 });
    db.exec("CREATE TRIGGER fail_normalization BEFORE DELETE ON ranking_choices BEGIN SELECT RAISE(ABORT, 'forced failure'); END;");
    db.exec("INSERT INTO ranking_choices (choice_id, manager_id, ranking_type, item_a_id, item_b_id, winner_id, loser_id) VALUES ('c', '6', 'games', 'a', 'b', 'a', 'b');");
    await assert.rejects(addItem(env, "6", "games", { name: "Second", revision: 1 }), /forced failure/);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ranking_items").get().n, 1);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ranking_snapshots").get().n, 0);
    assert.equal(db.prepare("SELECT revision FROM ranking_revisions").get().revision, 1);
  } finally { db.close(); }
});
