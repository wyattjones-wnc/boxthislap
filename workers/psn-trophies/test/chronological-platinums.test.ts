import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const migrations = new URL("../migrations/", import.meta.url);
const repair = readFileSync(new URL("0015_chronological_platinums.sql", migrations), "utf8");

function database(applyRepair = true) {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
    if (name.startsWith("0015")) continue;
    db.exec(readFileSync(new URL(name, migrations), "utf8"));
  }
  if (applyRepair) db.exec(repair);
  return db;
}

function earn(db: DatabaseSync, game: string, date: string, type = "platinum") {
  db.prepare(`INSERT INTO games (id, title_name, first_seen_at, last_synced_at)
    VALUES (?, ?, 'now', 'now') ON CONFLICT(id) DO NOTHING`).run(game, game);
  db.prepare(`INSERT INTO trophies
    (game_id, trophy_id, trophy_name, trophy_type, earned, earned_at, first_seen_at, last_synced_at)
    VALUES (?, 0, 'Trophy', ?, 1, ?, 'now', 'now')
    ON CONFLICT(game_id, trophy_id) DO UPDATE SET earned = excluded.earned,
      earned_at = excluded.earned_at, trophy_type = excluded.trophy_type`).run(game, type, date);
}

function numbers(db: DatabaseSync) {
  return db.prepare("SELECT game_id, platinum_number FROM trophies WHERE platinum_number > 0 ORDER BY platinum_number").all()
    .map((row) => [row.game_id, row.platinum_number]);
}

test("repairs #164 and #165 while preserving preferences and trophy ordinals", () => {
  const db = database(false);
  try {
    for (let i = 1; i <= 163; i++) earn(db, `old-${i}`, new Date(Date.UTC(2025, 0, i)).toISOString());
    earn(db, "Borderlands", "2026-10-23T19:50:28.000Z");
    earn(db, "Car Mechanic", "2026-10-15T04:16:14.000Z");
    db.exec(`INSERT INTO trophy_preferences VALUES ('Car Mechanic', 0, 'favorite', 'now', '6')`);
    const ordinals = db.prepare("SELECT game_id, earned_number FROM trophies ORDER BY game_id").all();
    db.exec(repair);
    assert.deepEqual(numbers(db).slice(-2), [["Car Mechanic", 164], ["Borderlands", 165]]);
    assert.deepEqual(db.prepare("SELECT game_id, earned_number FROM trophies ORDER BY game_id").all(), ordinals);
    assert.equal(db.prepare("SELECT state FROM trophy_preferences").get()?.state, "favorite");
    db.exec(repair);
    assert.deepEqual(numbers(db).slice(-2), [["Car Mechanic", 164], ["Borderlands", 165]]);
  } finally { db.close(); }
});

test("late imports, timestamp corrections, ties, retries and rollbacks remain chronological", () => {
  const db = database();
  try {
    earn(db, "z", "2026-10-23");
    earn(db, "b", "2026-10-15");
    earn(db, "a", "2026-10-15");
    assert.deepEqual(numbers(db), [["a", 1], ["b", 2], ["z", 3]]);
    earn(db, "z", "2026-10-01");
    earn(db, "z", "2026-10-01");
    assert.deepEqual(numbers(db), [["z", 1], ["a", 2], ["b", 3]]);
    db.exec("BEGIN");
    earn(db, "earliest", "2026-09-01");
    db.exec("ROLLBACK");
    assert.deepEqual(numbers(db), [["z", 1], ["a", 2], ["b", 3]]);
    db.exec("UPDATE trophies SET earned = 0 WHERE game_id = 'z'");
    assert.deepEqual(numbers(db), [["a", 1], ["b", 2]]);
    earn(db, "z", "2026-10-01");
    earn(db, "bronze", "2026-09-01", "bronze");
    assert.deepEqual(numbers(db), [["z", 1], ["a", 2], ["b", 3]]);
    assert.equal(db.prepare("SELECT value FROM sync_state WHERE key = 'platinum_number'").get()?.value, "3");
  } finally { db.close(); }
});
