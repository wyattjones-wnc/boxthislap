const PLAYER_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRlUykKGjYLQY5KqHJt0uF-b3HmhZZSAYCgZdF2L8cRxTlP64gPOWp7uiqC4zG8IlSy3eODn4vybN56/pub?gid=936826783&single=true&output=csv";

export const DATA_SOURCES = {
  matches: "matches.json",
  players: PLAYER_SHEET_URL,
};

export async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load JSON from ${path}: ${response.status}`);
  }

  return response.json();
}

export async function loadCsv(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load CSV from ${url}: ${response.status}`);
  }

  return parseCsv(await response.text());
}

export async function loadMatches() {
  return loadJson(DATA_SOURCES.matches);
}

export async function loadPlayers() {
  const rows = await loadCsv(DATA_SOURCES.players);
  return rows.map(normalizePlayerRow);
}

export async function loadSiteData() {
  const [matches, players] = await Promise.all([loadMatches(), loadPlayers()]);
  return { matches, players };
}

export function parseCsv(csvText) {
  const rows = parseCsvRows(stripBom(csvText));

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());

  return rows.slice(1).filter(hasValues).map((row) => {
    return headers.reduce((record, header, index) => {
      record[header || `Column ${index + 1}`] = row[index] ?? "";
      return record;
    }, {});
  });
}

function normalizePlayerRow(row) {
  return {
    id: row.ID,
    name: row.Name,
    team: row.Team,
    position: row.Position,
    playerNumber: row["Player #"],
    transfermarktPrice: row["Transfermarkt Price"],
    drafted: row.Drafted,
    raw: row,
  };
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function hasValues(row) {
  return row.some((value) => value.trim() !== "");
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";

      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      continue;
    }

    field += char;
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
