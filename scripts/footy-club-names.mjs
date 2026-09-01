const FOOTBALL_CLUB_NAME_ALIASES = Object.freeze({
  "athletic bilbao": "athletic club",
  "slavia prague": "slavia praha",
  "sporting clube de portugal": "sporting",
  "sporting cp": "sporting",
});

export function isSameFootballClubName(firstName, secondName) {
  const first = normalizeFootballClubName(firstName);
  const second = normalizeFootballClubName(secondName);

  if (!first || !second) return false;
  if (first === second) return true;

  const firstTokens = getFootballClubIdentityTokens(first);
  const secondTokens = getFootballClubIdentityTokens(second);
  const shorterTokens = firstTokens.length <= secondTokens.length ? firstTokens : secondTokens;
  const longerTokens = new Set(firstTokens.length <= secondTokens.length ? secondTokens : firstTokens);

  return shorterTokens.length > 0 &&
    shorterTokens.reduce((length, token) => length + token.length, 0) >= 6 &&
    shorterTokens.every((token) => longerTokens.has(token));
}

export function normalizeFootballClubName(value) {
  const normalizedName = String(value ?? "").trim().toLowerCase()
    .replace(/\b(afc|cf|fc|fk|osc|sc|sk)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return FOOTBALL_CLUB_NAME_ALIASES[normalizedName] || normalizedName;
}

function getFootballClubIdentityTokens(value) {
  return String(value ?? "").trim().toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((token) => token && !["de", "del", "la", "the"].includes(token));
}
