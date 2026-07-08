const GOOGLE_SHEET_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRlUykKGjYLQY5KqHJt0uF-b3HmhZZSAYCgZdF2L8cRxTlP64gPOWp7uiqC4zG8IlSy3eODn4vybN56/pub";
const FORMULA_ONE_2024_SHEET_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTV8iyxCJX5DWDRzBNCyfzq7lCJkk5fFnZz8p0uCiNwXAsZEvXcdgdyDIu9haoRBmZ0ToreIRBl8Y3O/pub";
const FORMULA_ONE_2025_SHEET_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRrushAAc96VpAzSRiZsRK0198bbcVYBAFVxVmnaDtZ5fA1S6DlcXoLcLePVs75orDJRhNk9po44HW_/pub";
const FORMULA_ONE_2025_WEEKLY_SHEET_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR4JBp8m58prqFPqifgHB0xS7y-mFEUwKFQwnEctIAT207dWYEJHEXfGb9sJpXARsTdeylYMascufcz/pub";
const FORMULA_ONE_2026_SHEET_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSBdrnquLj8KnJhAFtF5hCdiW3TD-ILKxkk8G2av4DGc5bwPbP7WHOO-_5Mbh8urjAo4c0MAxSKF_pt/pub";
const FORMULA_ONE_2026_WEEKLY_SHEET_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTx5bYjw_XeqE4Pk6SosOnf-S0tFQI5IeyERphgP7BjKpum-0Qj2vTokmy99qgvbyvH6OU9_ENJjA-2/pub";
const FANTASY_OFFICE_2025_SHEET_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSYSfJjflJkmjJBmS5zr08qfr0Ul3DdjUk4ER988JtWz5jy5P5-z7v4E4tMQzW6K06IswWas8CRl7Yn/pub";
const FANTASY_OFFICE_2026_SHEET_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrjQ6L5xMBMnuDNrN95ngeKbTePfJeGltNCIVAai7bZKdgFG_Djj68OBZvK7B9VnREA-Ux4VbeaQZ-/pub";

export const DATA_SOURCES = {
  sheets: {
    data: buildPublishedCsvUrl("1157515704"),
    managers: buildPublishedCsvUrl("0"),
    teams: buildPublishedCsvUrl("1758025145"),
    teamDraft: buildPublishedCsvUrl("1723208765"),
    players: buildPublishedCsvUrl("936826783"),
    playerDraft: buildPublishedCsvUrl("642225169"),
    matchResults: buildPublishedCsvUrl("396388040"),
    playerPerformances: buildPublishedCsvUrl("2122871848"),
    standings: buildPublishedCsvUrl("705930353"),
    formulaOne2024: buildFormulaOne2024CsvUrl("1705332201"),
    formulaOne2025: buildFormulaOne2025CsvUrl("1705332201"),
    formulaOne2025Weekly: buildFormulaOne2025WeeklyCsvUrl("1508426028"),
    formulaOne2026: buildFormulaOne2026CsvUrl("1705332201"),
    formulaOne2026Weekly: buildFormulaOne2026WeeklyCsvUrl("1508426028"),
    formulaOne2026WeeklyResults: buildFormulaOne2026WeeklyCsvUrl("700652503"),
    formulaOne2026RoundForms: buildFormulaOne2026WeeklyCsvUrl("2022697649"),
    fantasyOffice2025Draft: buildFantasyOffice2025CsvUrl("1020743771"),
    fantasyOffice2025Movies: buildFantasyOffice2025CsvUrl("517732298"),
    fantasyOffice2025Results: buildFantasyOffice2025CsvUrl("420488658"),
    fantasyOffice2025Ordering: buildFantasyOffice2025CsvUrl("929460611"),
    fantasyOffice2026Draft: buildFantasyOffice2026CsvUrl("1020743771"),
    bracketPicks: buildPublishedCsvUrl("1943594150"),
  },
};

export async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load JSON from ${path}: ${response.status}`);
  }

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse JSON from ${path}: ${error.message}`);
  }
}

export async function loadCsv(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load CSV from ${url}: ${response.status}`);
  }

  return parseCsv(await response.text());
}

export async function loadCsvText(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load CSV from ${url}: ${response.status}`);
  }

  return response.text();
}

export async function loadPlayers() {
  const rows = await loadSheet("players");
  return rows.map(normalizePlayerRow);
}

export function loadSheet(sheetName) {
  const url = DATA_SOURCES.sheets[sheetName];

  if (!url) {
    throw new Error(`Unknown sheet source: ${sheetName}`);
  }

  return loadCsv(url);
}

export function loadSheetText(sheetName) {
  const url = DATA_SOURCES.sheets[sheetName];

  if (!url) {
    throw new Error(`Unknown sheet source: ${sheetName}`);
  }

  return loadCsvText(url);
}

export async function loadSheets(sheetNames = Object.keys(DATA_SOURCES.sheets)) {
  const entries = await Promise.all(
    sheetNames.map(async (sheetName) => [sheetName, await loadSheet(sheetName)])
  );

  return Object.fromEntries(entries);
}

export async function loadSiteData() {
  const sheets = await loadSheets();
  return { sheets, players: sheets.players.map(normalizePlayerRow) };
}

export function parseCsv(csvText) {
  const rows = parseCsvRows(stripBom(csvText));

  if (rows.length === 0) {
    return [];
  }

  const headers = getUniqueHeaders(rows[0].map((header) => header.trim()));

  return rows.slice(1).filter(hasValues).map((row) => {
    return headers.reduce((record, header, index) => {
      record[header || `Column ${index + 1}`] = row[index] ?? "";
      return record;
    }, {});
  });
}

function getUniqueHeaders(headers) {
  const counts = new Map();

  return headers.map((header, index) => {
    const fallbackHeader = header || `Column ${index + 1}`;
    const count = counts.get(fallbackHeader) ?? 0;
    counts.set(fallbackHeader, count + 1);

    return count === 0 ? fallbackHeader : `${fallbackHeader} ${count + 1}`;
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

function buildPublishedCsvUrl(gid) {
  return `${GOOGLE_SHEET_BASE_URL}?gid=${encodeURIComponent(gid)}&single=true&output=csv`;
}

function buildFormulaOne2024CsvUrl(gid) {
  return `${FORMULA_ONE_2024_SHEET_BASE_URL}?gid=${encodeURIComponent(gid)}&single=true&output=csv`;
}

function buildFormulaOne2025CsvUrl(gid) {
  return `${FORMULA_ONE_2025_SHEET_BASE_URL}?gid=${encodeURIComponent(gid)}&single=true&output=csv`;
}

function buildFormulaOne2025WeeklyCsvUrl(gid) {
  return `${FORMULA_ONE_2025_WEEKLY_SHEET_BASE_URL}?gid=${encodeURIComponent(gid)}&single=true&output=csv`;
}

function buildFormulaOne2026CsvUrl(gid) {
  return `${FORMULA_ONE_2026_SHEET_BASE_URL}?gid=${encodeURIComponent(gid)}&single=true&output=csv`;
}

function buildFormulaOne2026WeeklyCsvUrl(gid) {
  return `${FORMULA_ONE_2026_WEEKLY_SHEET_BASE_URL}?gid=${encodeURIComponent(gid)}&single=true&output=csv`;
}

function buildFantasyOffice2025CsvUrl(gid) {
  return `${FANTASY_OFFICE_2025_SHEET_BASE_URL}?gid=${encodeURIComponent(gid)}&single=true&output=csv`;
}

function buildFantasyOffice2026CsvUrl(gid) {
  return `${FANTASY_OFFICE_2026_SHEET_BASE_URL}?gid=${encodeURIComponent(gid)}&single=true&output=csv`;
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
