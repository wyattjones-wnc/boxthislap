import { pathToFileURL } from "node:url";

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrjQ6L5xMBMnuDNrN95ngeKbTePfJeGltNCIVAai7bZKdgFG_Djj68OBZvK7B9VnREA-Ux4VbeaQZ-/pub?gid=1020743771&single=true&output=csv";
const DEFAULT_ENDPOINT =
  "https://box-this-lap-fantasy-office.boxthislap.workers.dev";

export function parseCsvMatrix(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((entry) => entry.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (value || row.length) {
    row.push(value);
    if (row.some((entry) => entry.trim())) rows.push(row);
  }
  return rows;
}

export function parseLegacyDraft(csvText) {
  const rows = parseCsvMatrix(csvText);
  const managerRow = rows.find(
    (row) => !row[0]?.trim() && row.slice(1).some((value) => value.trim()),
  );
  if (!managerRow) throw new Error("Draft manager row was not found.");
  const managerIndex = rows.indexOf(managerRow);
  const picks = rows.slice(managerIndex + 1).filter((row) => {
    const pick = row[0]?.trim().toLowerCase();
    return /^(?:[1-9]|10)$/.test(pick) || pick === "sub";
  });
  return managerRow.slice(1).flatMap((manager, offset) => {
    const name = manager.trim();
    if (!name) return [];
    return picks.flatMap((row) => {
      const title = row[offset + 1]?.trim();
      if (!title) return [];
      const rawPick = row[0].trim();
      const substitute = rawPick.toLowerCase() === "sub";
      return [
        {
          active: !substitute,
          draftNumber: substitute ? "Sub" : `D${rawPick}`,
          manager: name,
          substitute,
          title,
        },
      ];
    });
  });
}

async function main() {
  const response = await fetch(
    process.env.FANTASY_OFFICE_SHEET_URL || DEFAULT_SHEET_URL,
  );
  if (!response.ok)
    throw new Error(`Draft sheet returned HTTP ${response.status}.`);
  const movies = parseLegacyDraft(await response.text());
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ count: movies.length, movies }, null, 2));
    console.log(
      "Preview only. Pass --apply to import this roster into D1 through the Worker.",
    );
    return;
  }
  const token = process.env.FANTASY_OFFICE_ADMIN_TOKEN;
  if (!token)
    throw new Error("FANTASY_OFFICE_ADMIN_TOKEN is required with --apply.");
  const endpoint = process.env.FANTASY_OFFICE_ENDPOINT || DEFAULT_ENDPOINT;
  const importResponse = await fetch(
    `${endpoint}/api/admin/seasons/2026/import`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ movies, source: DEFAULT_SHEET_URL }),
    },
  );
  const result = await importResponse.json().catch(() => ({}));
  if (!importResponse.ok || !result.ok) {
    throw new Error(
      result.error || `Import returned HTTP ${importResponse.status}.`,
    );
  }
  console.log(`Imported ${result.imported} Fantasy Office movies.`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
