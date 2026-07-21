export function normalizeLookupName(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function parseCsvMatrix(text) {
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

export function parseRoundOptions(csvText) {
  const table = getRoundsTable(csvText);

  if (!table) {
    return [];
  }

  const rounds = [];

  for (const row of table.rows) {
    const name = row[table.columns.round]?.trim() ?? "";
    const id = row[table.columns.id]?.trim() ?? "";
    const prettyName = row[table.columns.prettyName]?.trim() ?? "";

    if (!name && !id) {
      break;
    }

    if (!name || !id || normalizeLookupName(name) === "updated") {
      continue;
    }

    rounds.push({ id, name, prettyName: prettyName || name });
  }

  return rounds;
}

export function parseUpdatedTime(csvText) {
  const table = getRoundsTable(csvText);

  if (!table) {
    return "";
  }

  for (const row of table.rows) {
    const name = row[table.columns.round]?.trim() ?? "";
    const id = row[table.columns.id]?.trim() ?? "";

    if (!name && !id) {
      break;
    }

    if (normalizeLookupName(name) === "updated") {
      return id;
    }
  }

  return "";
}

export function parseRoundMappings(csvText) {
  const rows = parseCsvMatrix(csvText);
  const headerIndex = rows.findIndex((row) => {
    const normalizedHeaders = row.map(normalizeLookupName);

    return normalizedHeaders.includes("round") &&
      normalizedHeaders.includes("player round") &&
      normalizedHeaders.includes("nation round");
  });

  if (headerIndex === -1) {
    return [];
  }

  const headerRow = rows[headerIndex];
  const columns = Object.fromEntries(
    headerRow.map((header, index) => [normalizeLookupName(header), index])
  );
  const mappings = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const roundValue = row[columns.round]?.trim() ?? "";

    if (!roundValue) {
      break;
    }

    const range = parseRoundRange(roundValue);

    if (!range) {
      continue;
    }

    mappings.push({
      end: range.end,
      label: roundValue,
      nationRound: parseDraftRoundLimit(row[columns["nation round"]]),
      playerRound: parseDraftRoundLimit(row[columns["player round"]]),
      start: range.start,
    });
  }

  return mappings;
}

function parseRoundRange(value) {
  const numbers = String(value ?? "").match(/\d+/g)?.map(Number).filter(Number.isFinite) ?? [];

  if (numbers.length === 0) {
    return null;
  }

  return {
    end: numbers.length > 1 ? Math.max(numbers[0], numbers[1]) : numbers[0],
    start: numbers.length > 1 ? Math.min(numbers[0], numbers[1]) : numbers[0],
  };
}

export function parseDraftRoundLimit(value) {
  const numbers = String(value ?? "").match(/\d+/g)?.map(Number).filter(Number.isFinite) ?? [];

  return numbers.length > 0 ? Math.max(...numbers) : null;
}

export function parseScheduleMatches(csvText) {
  const rows = parseCsvMatrix(csvText);
  const headerIndex = rows.findIndex((row) => {
    const normalizedHeaders = row.map(normalizeLookupName);

    return normalizedHeaders.includes("date") &&
      normalizedHeaders.includes("match #") &&
      normalizedHeaders.includes("home") &&
      normalizedHeaders.includes("away");
  });

  if (headerIndex === -1) {
    return [];
  }

  const headerRow = rows[headerIndex];
  const columns = Object.fromEntries(
    headerRow.map((header, index) => [normalizeLookupName(header), index])
  );
  const matches = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const isBlankRow = row.every((value) => !String(value ?? "").trim());

    if (isBlankRow) {
      break;
    }

    const id = row[columns["match #"]]?.trim() ?? "";
    const home = row[columns.home]?.trim() ?? "";
    const away = row[columns.away]?.trim() ?? "";

    if (!id || !home || !away) {
      continue;
    }

    matches.push({
      Away: away,
      Date: formatScheduleDate(row[columns.date]?.trim() ?? ""),
      Home: home,
      Id: id,
      Time: row[columns.time]?.trim() ?? "",
    });
  }

  return matches;
}

function formatScheduleDate(value) {
  const text = String(value ?? "").trim();
  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (!slashMatch) {
    return text;
  }

  const year = Number(slashMatch[3]) < 100 ? 2000 + Number(slashMatch[3]) : Number(slashMatch[3]);
  const month = String(Number(slashMatch[1])).padStart(2, "0");
  const day = String(Number(slashMatch[2])).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatUpdatedTime(value) {
  const text = String(value ?? "").trim().replace(/^updated\s+/i, "").replace(/\s+ET$/i, "");
  const dateTime = parseUpdatedDateTime(text);

  if (!dateTime) {
    return `${text} ET`;
  }

  return `${dateTime.monthName} ${dateTime.day}, ${dateTime.year} ${formatUpdatedClockTime(dateTime.hour, dateTime.minute)} ET`;
}

function getRoundsTable(csvText) {
  const rows = parseCsvMatrix(csvText);
  const headerRow = rows.find((row) => {
    return row.some((value, index) => normalizeLookupName(value) === "round" && normalizeLookupName(row[index + 1]) === "id");
  });

  if (!headerRow) {
    return null;
  }

  const roundColumn = headerRow.findIndex((value, index) => {
    return normalizeLookupName(value) === "round" && normalizeLookupName(headerRow[index + 1]) === "id";
  });
  const prettyNameColumn = headerRow.findIndex((value) => normalizeLookupName(value) === "pretty name");
  const startIndex = rows.indexOf(headerRow) + 1;

  return {
    columns: {
      id: roundColumn + 1,
      prettyName: prettyNameColumn,
      round: roundColumn,
    },
    rows: rows.slice(startIndex),
  };
}

function parseUpdatedDateTime(value) {
  const slashMatch = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(AM|PM)?)?$/i);

  if (slashMatch) {
    return buildUpdatedDateTime({
      day: slashMatch[2],
      hour: slashMatch[4],
      meridiem: slashMatch[6],
      minute: slashMatch[5],
      month: slashMatch[1],
      year: slashMatch[3],
    });
  }

  const isoMatch = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(AM|PM)?)?$/i);

  if (isoMatch) {
    return buildUpdatedDateTime({
      day: isoMatch[3],
      hour: isoMatch[4],
      meridiem: isoMatch[6],
      minute: isoMatch[5],
      month: isoMatch[2],
      year: isoMatch[1],
    });
  }

  return null;
}

function buildUpdatedDateTime({ day, hour, meridiem, minute, month, year }) {
  const numericYear = Number(year) < 100 ? 2000 + Number(year) : Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const numericMinute = minute === undefined ? 0 : Number(minute);
  let numericHour = hour === undefined ? 0 : Number(hour);

  if (!numericYear || numericMonth < 1 || numericMonth > 12 || numericDay < 1 || numericDay > 31 || numericMinute < 0 || numericMinute > 59) {
    return null;
  }

  if (meridiem) {
    const period = meridiem.toUpperCase();
    numericHour = numericHour % 12;

    if (period === "PM") {
      numericHour += 12;
    }
  }

  if (numericHour < 0 || numericHour > 23) {
    return null;
  }

  return {
    day: numericDay,
    hour: numericHour,
    minute: numericMinute,
    monthName: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(numericYear, numericMonth - 1, 1))),
    year: numericYear,
  };
}

function formatUpdatedClockTime(hour, minute) {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}
