import { writeFile } from "node:fs/promises";
import process from "node:process";

const DEFAULT_SOURCE = "https://script.google.com/macros/s/AKfycby8dGLrEIZjonAowrIAUAhU7FtSMRh6MODmZ6Nb86IU-JjFWMuhBkax00czlpEYKbGs/exec";
const args = parseArgs(process.argv.slice(2));

if (args.verify) {
  await verifyMigration(args.source || DEFAULT_SOURCE, args.verify);
} else if (args.output) {
  const notes = await loadLegacyNotes(args.source || DEFAULT_SOURCE);
  await writeFile(args.output, buildImportSql(notes), "utf8");
  console.log(`Wrote ${notes.length} Match Notes rows to ${args.output}`);
} else {
  throw new Error("Use --output <path> to generate import SQL or --verify <Cloudflare endpoint> to compare data.");
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (!["--output", "--source", "--verify"].includes(key) || !values[index + 1]) {
      throw new Error(`Unknown or incomplete argument: ${key}`);
    }
    parsed[key.slice(2)] = values[index + 1];
    index += 1;
  }
  return parsed;
}

async function loadLegacyNotes(endpoint) {
  const url = new URL(endpoint);
  url.searchParams.set("action", "listFootyMatchNotes");
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const value = await response.json();
  if (!response.ok || !value?.ok || !Array.isArray(value.notes)) {
    throw new Error(value?.error || `Legacy Match Notes endpoint returned ${response.status}.`);
  }
  return value.notes.map(normalizeNote).filter((note) => note.matchId);
}

async function loadCloudflareNotes(endpoint) {
  const url = new URL("api/match-notes", `${endpoint.replace(/\/$/, "")}/`);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const value = await response.json();
  if (!response.ok || !value?.ok || !Array.isArray(value.notes)) {
    throw new Error(value?.error || `Cloudflare Match Notes endpoint returned ${response.status}.`);
  }
  return value.notes.map(normalizeNote).filter((note) => note.matchId);
}

async function verifyMigration(source, destination) {
  const [legacyNotes, cloudflareNotes] = await Promise.all([
    loadLegacyNotes(source),
    loadCloudflareNotes(destination),
  ]);
  const legacy = new Map(legacyNotes.map((note) => [note.matchId, canonical(note)]));
  const cloudflare = new Map(cloudflareNotes.map((note) => [note.matchId, canonical(note)]));
  const differences = [];

  for (const [matchId, value] of legacy) {
    if (!cloudflare.has(matchId)) differences.push(`${matchId}: missing from Cloudflare`);
    else if (cloudflare.get(matchId) !== value) differences.push(`${matchId}: values differ`);
  }
  for (const matchId of cloudflare.keys()) {
    if (!legacy.has(matchId)) differences.push(`${matchId}: missing from legacy source`);
  }

  if (differences.length) {
    throw new Error(`Match Notes migration differs:\n${differences.join("\n")}`);
  }
  console.log(`Verified ${legacy.size} Match Notes rows with no differences.`);
}

function buildImportSql(notes) {
  const statements = notes.map((note) => `INSERT INTO footy_match_notes (
  match_id, home_score, away_score, follow_goal_assists,
  opponent_goal_assists, note, highlight_link, revision, updated_by
) VALUES (
  ${sql(note.matchId)}, ${sql(note.homeScore)}, ${sql(note.awayScore)}, ${sql(JSON.stringify(note.followGoalAssists))},
  ${sql(JSON.stringify(note.opponentGoalAssists))}, ${sql(note.note)}, ${sql(note.highlightLink)}, 1, 'legacy-import'
) ON CONFLICT(match_id) DO UPDATE SET
  home_score = excluded.home_score,
  away_score = excluded.away_score,
  follow_goal_assists = excluded.follow_goal_assists,
  opponent_goal_assists = excluded.opponent_goal_assists,
  note = excluded.note,
  highlight_link = excluded.highlight_link,
  revision = excluded.revision,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = excluded.updated_by;
INSERT INTO footy_match_note_history (
  match_id, revision, home_score, away_score, follow_goal_assists,
  opponent_goal_assists, note, highlight_link, changed_by
) VALUES (
  ${sql(note.matchId)}, 1, ${sql(note.homeScore)}, ${sql(note.awayScore)}, ${sql(JSON.stringify(note.followGoalAssists))},
  ${sql(JSON.stringify(note.opponentGoalAssists))}, ${sql(note.note)}, ${sql(note.highlightLink)}, 'legacy-import'
) ON CONFLICT(match_id, revision) DO UPDATE SET
  home_score = excluded.home_score,
  away_score = excluded.away_score,
  follow_goal_assists = excluded.follow_goal_assists,
  opponent_goal_assists = excluded.opponent_goal_assists,
  note = excluded.note,
  highlight_link = excluded.highlight_link,
  changed_at = CURRENT_TIMESTAMP,
  changed_by = excluded.changed_by;`);

  return `${statements.join("\n")}\n`;
}

function normalizeNote(note) {
  return {
    matchId: String(note?.matchId ?? note?.["Match ID"] ?? "").trim(),
    homeScore: String(note?.homeScore ?? note?.["Home Score"] ?? "").trim(),
    awayScore: String(note?.awayScore ?? note?.["Away Score"] ?? "").trim(),
    followGoalAssists: normalizeGoalAssists(note?.followGoalAssists ?? note?.["Follow G/A"]),
    opponentGoalAssists: normalizeGoalAssists(note?.opponentGoalAssists ?? note?.["Opp G/A"]),
    note: String(note?.note ?? note?.Note ?? "").trim(),
    highlightLink: String(note?.highlightLink ?? note?.["Highlight Link"] ?? "").trim(),
  };
}

function normalizeGoalAssists(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => ({
    scorer: String(entry?.scorer ?? "").trim(),
    assister: String(entry?.assister ?? "").trim(),
    penalty: Boolean(entry?.penalty),
    ...(String(entry?.minute ?? "").trim() ? { minute: String(entry.minute).trim() } : {}),
  }));
}

function canonical(note) {
  const { matchId: _matchId, ...values } = note;
  return JSON.stringify(values);
}

function sql(value) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}
