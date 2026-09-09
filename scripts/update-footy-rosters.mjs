import { access } from "node:fs/promises";
import path from "node:path";

const FOOTY_DATA_ENDPOINT = process.env.FOOTY_DATA_ENDPOINT || "https://script.google.com/macros/s/AKfycby8dGLrEIZjonAowrIAUAhU7FtSMRh6MODmZ6Nb86IU-JjFWMuhBkax00czlpEYKbGs/exec";
const ROSTER_ENDPOINT = process.env.FOOTY_ROSTER_SYNC_ENDPOINT || "";
const SYNC_TOKEN = process.env.FOOTY_ROSTER_SYNC_TOKEN || "";
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || "";
const FOOTBALL_DATA_TEAM_IDS = { "1": "57", "2": "81", "3": "404" };
const SPORTDB_TEAM_IDS = { "1": "133604", "2": "133739", "3": "134775", "6": "140078", "7": "137699" };
const FOLLOWED_TEAM_IDS = ["1", "2", "3", "4", "5", "6", "7"];
const SHOULD_SEED_LEGACY = process.argv.includes("--seed-legacy");

const legacyRosters = SHOULD_SEED_LEGACY ? await loadLegacyRosters() : [];
const rosters = [];
for (const teamId of FOLLOWED_TEAM_IDS) {
  const legacy = legacyRosters.find((roster) => String(roster.teamId) === teamId);
  const season = currentSeason(teamId);
  const [footballPlayers, sportDbPlayers] = await Promise.all([
    loadFootballDataPlayers(teamId),
    loadSportDbPlayers(teamId),
  ]);
  const players = [];
  const matchedLegacy = new Set();

  for (const player of footballPlayers) {
    const legacyPlayer = findIdentityMatch(player, legacy?.players || [], matchedLegacy);
    const media = findIdentityMatch(player, sportDbPlayers) || {};
    if (legacyPlayer) matchedLegacy.add(legacyPlayer);
    players.push({
      playerKey: `football-data.org:${player.id}`,
      provider: "football-data.org",
      providerPlayerId: String(player.id),
      providerData: {
        name: player.name,
        position: normalizePosition(player.position),
        number: String(player.shirtNumber || ""),
        birthday: String(player.dateOfBirth || ""),
        homeCountry: String(player.nationality || ""),
        profileImage: media.profileImage || "",
        cardImage: media.cardImage || "",
      },
      seedOverrides: legacyPlayer ? await legacyOverrides(legacyPlayer, legacy?.season || season) : {},
    });
  }

  for (const player of sportDbPlayers) {
    if (findIdentityMatch(player, footballPlayers)) continue;
    const legacyPlayer = findIdentityMatch(player, legacy?.players || [], matchedLegacy);
    if (legacyPlayer) matchedLegacy.add(legacyPlayer);
    players.push({
      playerKey: `thesportsdb:${player.id}`,
      provider: "TheSportsDB",
      providerPlayerId: player.id,
      providerData: player,
      seedOverrides: legacyPlayer ? await legacyOverrides(legacyPlayer, legacy?.season || season) : {},
    });
  }

  for (const player of legacy?.players || []) {
    if (matchedLegacy.has(player)) continue;
    const providerData = normalizeLegacyPlayer(player);
    players.push({
      playerKey: `legacy-sheet:${player.id || normalizeName(player.player)}`,
      provider: "legacy-sheet",
      providerPlayerId: String(player.id || ""),
      manual: true,
      providerData,
      seedOverrides: await legacyOverrides(player, legacy?.season || season),
    });
  }
  if (SHOULD_SEED_LEGACY && legacy?.players?.length) {
    const priorSeason = previousSeason(teamId, season);
    const priorPlayers = await Promise.all(legacy.players
      .filter((player) => wasOnRosterBySeason(player, priorSeason, season))
      .map(async (player) => ({
        playerKey: `legacy-history:${season}:${player.id || normalizeName(player.player)}`,
        provider: "legacy-history",
        providerPlayerId: String(player.id || ""),
        manual: true,
        providerData: { ...normalizeLegacyPlayer(player), transferOut: false },
        seedOverrides: await legacyOverrides(player, legacy?.season || season),
      })));
    if (priorPlayers.length) rosters.push({ teamId, season: priorSeason, active: false, players: priorPlayers });
  }
  if (players.length) rosters.push({ teamId, season, active: true, players });
}

const summary = rosters.map((roster) => ({ teamId: roster.teamId, season: roster.season, players: roster.players.length }));
if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  if (!ROSTER_ENDPOINT || !SYNC_TOKEN) throw new Error("FOOTY_ROSTER_SYNC_ENDPOINT and FOOTY_ROSTER_SYNC_TOKEN are required.");
  const response = await fetch(`${ROSTER_ENDPOINT.replace(/\/$/, "")}/api/rosters/sync`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "X-Roster-Sync-Token": SYNC_TOKEN },
    body: JSON.stringify({ rosters }),
  });
  const value = await response.json().catch(() => null);
  if (!response.ok || !value?.ok) throw new Error(value?.error || `Roster endpoint returned ${response.status}.`);
  console.log(JSON.stringify({ ...value, rosters: summary }, null, 2));
}

async function loadLegacyRosters() {
  const callback = "boxThisLapRosterSync";
  const callbackId = `sync-${Date.now()}`;
  const url = new URL(FOOTY_DATA_ENDPOINT);
  url.searchParams.set("action", "listFootyRosters");
  url.searchParams.set("callback", callback);
  url.searchParams.set("callbackId", callbackId);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Legacy roster endpoint returned ${response.status}.`);
  const text = await response.text();
  const match = text.match(new RegExp(`^${callback}\\((.*)\\);?$`, "s"));
  if (!match) throw new Error("Legacy roster endpoint returned an invalid JSONP response.");
  const value = JSON.parse(match[1]);
  if (!value.ok) throw new Error(value.error || "Legacy rosters could not be loaded.");
  return Array.isArray(value.rosters) ? value.rosters : [];
}

async function loadFootballDataPlayers(teamId) {
  const providerId = FOOTBALL_DATA_TEAM_IDS[teamId];
  if (!providerId || !FOOTBALL_DATA_API_KEY) return [];
  const response = await fetch(`https://api.football-data.org/v4/teams/${providerId}`, { headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY } });
  if (!response.ok) throw new Error(`football-data.org team ${providerId} returned ${response.status}.`);
  const value = await response.json();
  return (value.squad || []).filter((person) => person.id && person.name && person.position);
}

async function loadSportDbPlayers(teamId) {
  const providerId = SPORTDB_TEAM_IDS[teamId];
  if (!providerId) return [];
  const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=${providerId}`);
  if (!response.ok) return [];
  const value = await response.json();
  return (value.player || [])
    .filter((player) => player.idPlayer && player.strPlayer && !/coach|manager/i.test(String(player.strPosition || player.strStatus || "")))
    .map((player) => ({
      id: String(player.idPlayer),
      name: String(player.strPlayer),
      position: normalizePosition(player.strPosition),
      number: String(player.strNumber || ""),
      birthday: String(player.dateBorn || ""),
      homeCountry: String(player.strNationality || ""),
      profileImage: String(player.strCutout || player.strRender || player.strThumb || ""),
      cardImage: String(player.strThumb || player.strRender || player.strCutout || ""),
    }));
}

function normalizeLegacyPlayer(player) {
  return {
    name: String(player.player || ""),
    position: String(player.position || ""),
    number: String(player.number || ""),
    appearances: String(player.app || ""),
    birthday: String(player.birthday || ""),
    homeCountry: String(player.home || ""),
    yearJoined: String(player.joined || ""),
    clubJoinedFrom: String(player.left || ""),
    fromAcademy: truthy(player.fromAcademy),
    isNew: marked(player.new),
    transferOut: truthy(player.transferOut),
  };
}

async function legacyOverrides(player, assetSeason) {
  const normalized = normalizeLegacyPlayer(player);
  const data = Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== "" && value !== false));
  const folderSeason = String(assetSeason || "").replace(/[^a-z0-9]+/gi, "_");
  const base = `assets/players/${folderSeason}/${player.teamId}/${player.id}`;
  if (player.transparent && await fileExists(path.resolve(base, player.transparent))) data.profileImage = `${base}/${player.transparent}`;
  if (await fileExists(path.resolve(base, "trading-card.webp"))) data.cardImage = `${base}/trading-card.webp`;
  return data;
}

async function fileExists(file) {
  try { await access(file); return true; } catch { return false; }
}

function currentSeason(teamId, date = new Date()) {
  const year = date.getUTCFullYear();
  if (["1", "2", "3"].includes(teamId)) {
    const start = date.getUTCMonth() >= 6 ? year : year - 1;
    return `${start}-${String(start + 1).slice(-2)}`;
  }
  return String(year);
}

function normalizePosition(value) {
  const position = String(value || "").trim();
  return ({ Goalkeeper: "GK", Defence: "DF", Defender: "DF", Midfield: "MF", Midfielder: "MF", Offence: "FW", Attacker: "FW", Forward: "FW" })[position] || position;
}

function normalizeName(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findIdentityMatch(player, candidates, excluded = new Set()) {
  const name = normalizeName(player.name || player.player);
  const birthday = normalizeBirthday(player.birthday || player.dateOfBirth);
  return candidates.find((candidate) => {
    if (excluded.has(candidate)) return false;
    const candidateName = normalizeName(candidate.name || candidate.player);
    const candidateBirthday = normalizeBirthday(candidate.birthday || candidate.dateOfBirth);
    return Boolean(name && candidateName && name === candidateName) || Boolean(birthday && candidateBirthday && birthday === candidateBirthday);
  });
}

function normalizeBirthday(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const direct = text.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (direct) return direct;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function previousSeason(teamId, season) {
  if (["1", "2", "3"].includes(teamId)) {
    const start = Number(String(season).slice(0, 4)) - 1;
    return `${start}-${String(start + 1).slice(-2)}`;
  }
  return String(Number(season) - 1);
}

function wasOnRosterBySeason(player, season, currentRosterSeason) {
  const joined = Number(String(player.joined || "").match(/\d{4}/)?.[0]);
  const start = Number(String(season).slice(0, 4));
  const seasonEnd = String(season).includes("-") ? start + 1 : start;
  const currentStart = Number(String(currentRosterSeason).slice(0, 4));
  if (marked(player.new) && joined && currentStart && joined >= currentStart) return false;
  return !joined || !seasonEnd || joined <= seasonEnd;
}

function truthy(value) {
  return ["1", "true", "yes", "y"].includes(String(value || "").trim().toLowerCase());
}

function marked(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(normalized) && !["0", "false", "no", "n"].includes(normalized);
}
