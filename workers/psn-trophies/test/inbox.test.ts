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
  } finally {
    db.close();
  }
});
