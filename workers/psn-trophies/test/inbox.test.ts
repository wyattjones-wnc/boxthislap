import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const migrations = new URL("../migrations/", import.meta.url);

test("repeated sync upserts refresh the inbox without losing preferences or numbers", () => {
  const db = new DatabaseSync(":memory:");
  try {
    for (const name of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
      db.exec(readFileSync(new URL(name, migrations), "utf8"));
    }
    db.exec(`INSERT INTO games (id, title_name, first_seen_at, last_synced_at)
      VALUES ('game', 'Game', 'now', 'now')`);
    const upsert = db.prepare(`INSERT INTO trophies
      (game_id, trophy_id, trophy_name, trophy_type, earned, earned_at, earned_rate, first_seen_at, last_synced_at)
      VALUES ('game', 1, ?, 'platinum', 1, '2026-10-23', ?, 'now', 'now')
      ON CONFLICT(game_id, trophy_id) DO UPDATE SET
        trophy_name = excluded.trophy_name, earned = excluded.earned,
        earned_at = excluded.earned_at, earned_rate = excluded.earned_rate`);
    // Production already has both counters from previous syncs. New earned
    // trophies must update those rows from inside the outer trophy UPSERT.
    db.exec(`INSERT INTO sync_state (key, value, updated_at) VALUES
      ('earned_number', '0', 'old'), ('platinum_number', '0', 'old')
      ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
    upsert.run("Original", 1);
    upsert.run("Updated", 2);
    assert.equal(db.prepare("SELECT trophy_name FROM trophy_inbox").get()?.trophy_name, "Updated");
    assert.equal(db.prepare("SELECT earned_rate FROM trophy_inbox").get()?.earned_rate, 2);
    db.exec(`INSERT INTO trophy_preferences (game_id, trophy_id, state, updated_at, updated_by)
      VALUES ('game', 1, 'favorite', 'now', '6')`);
    upsert.run("Favorite", 3);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM trophy_inbox").get()?.count, 0);
    db.exec("DELETE FROM trophy_preferences");
    upsert.run("Restored", 4);
    assert.equal(db.prepare("SELECT trophy_name FROM trophy_inbox").get()?.trophy_name, "Restored");
    assert.equal(db.prepare("SELECT earned_number FROM trophies").get()?.earned_number, 1);
    assert.equal(db.prepare("SELECT platinum_number FROM trophies").get()?.platinum_number, 1);
    db.exec("UPDATE trophies SET earned = 0 WHERE trophy_id = 1");
    upsert.run("Earned again", 5);
    assert.equal(db.prepare("SELECT platinum_number FROM trophies").get()?.platinum_number, 1);
    assert.equal(db.prepare("SELECT value FROM sync_state WHERE key = 'platinum_number'").get()?.value, "1");
  } finally {
    db.close();
  }
});
