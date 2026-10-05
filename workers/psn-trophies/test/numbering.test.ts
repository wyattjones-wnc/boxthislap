import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const migration = readFileSync(new URL("../migrations/0012_atomic_trophy_numbers.sql", import.meta.url), "utf8");

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE trophies (game_id TEXT, trophy_id INTEGER, earned INTEGER,
    earned_at TEXT, trophy_type TEXT, earned_number INTEGER, platinum_number INTEGER,
    PRIMARY KEY(game_id, trophy_id));
    CREATE TABLE sync_state (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT);`);
  return db;
}

function insert(db: DatabaseSync, id: number) {
  db.prepare(`INSERT INTO trophies VALUES ('game', ?, 1, ?, 'platinum', NULL, NULL)
    ON CONFLICT(game_id, trophy_id) DO UPDATE SET earned = excluded.earned,
    earned_at = excluded.earned_at, trophy_type = excluded.trophy_type`).run(id, `2026-10-${String(id).padStart(2, "0")}`);
}

function number(db: DatabaseSync, id: number) {
  return db.prepare("SELECT platinum_number FROM trophies WHERE trophy_id = ?").get(id)?.platinum_number;
}

test("repairs platinum #175 to #163 and resets inflated counters", () => {
  const db = database();
  try {
    const seed = db.prepare("INSERT INTO trophies VALUES ('game', ?, 1, ?, 'platinum', ?, ?)");
    for (let id = 1; id <= 163; id++) seed.run(id, new Date(Date.UTC(2025, 0, id)).toISOString(), id, id === 163 ? 175 : id);
    db.exec("INSERT INTO sync_state VALUES ('platinum_number', '175', 'old')");
    db.exec(migration);
    assert.equal(number(db, 162), 162);
    assert.equal(number(db, 163), 163);
    assert.equal(db.prepare("SELECT value FROM sync_state WHERE key = 'platinum_number'").get()?.value, "163");
  } finally { db.close(); }
});

test("rollbacks and duplicate upserts do not consume trophy numbers", () => {
  const db = database();
  try {
    db.exec(migration);
    insert(db, 1);
    db.exec("BEGIN");
    insert(db, 2);
    db.exec("ROLLBACK");
    insert(db, 2);
    insert(db, 2);
    insert(db, 3);
    assert.equal(number(db, 1), 1);
    assert.equal(number(db, 2), 2);
    assert.equal(number(db, 3), 3);
    assert.equal(db.prepare("SELECT value FROM sync_state WHERE key = 'platinum_number'").get()?.value, "3");
    db.exec("UPDATE trophies SET earned = 0 WHERE trophy_id = 3");
    assert.equal(number(db, 3), null);
    db.exec("UPDATE trophies SET earned = 1 WHERE trophy_id = 3");
    assert.equal(number(db, 3), 3);
  } finally { db.close(); }
});
