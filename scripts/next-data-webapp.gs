const NEXT_DATA_SPREADSHEET_ID = "1HtAsM8VZ-6WtukozHd_mtZU4DJUh1Vn5QAtPeF72xUQ";

const NEXT_ITEM_COLUMNS = [
  "ID",
  "Thing",
  "Date",
  "End Date",
  "Time",
  "Priority Level",
  "Completed",
  "NonAdmin",
];
const RANKING_SHEETS = {
  games: "VG Ranking",
  mcu: "MCU Ranking",
  movies: "Movie Ranking",
  tv: "TV Ranking",
};

function doGet(e) {
  try {
    return webResponse(e, { ok: true, service: "boxthislap-next-data" });
  } catch (error) {
    return webResponse(e, { ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function doPost(e) {
  try {
    const payload = getPayload(e);

    if (payload.action === "saveNextItem") {
      return jsonResponse(saveNextItem(payload.item || {}));
    }

    if (payload.action === "saveRankingItem") {
      return jsonResponse(saveRankingItem(payload.ranking, payload.sheetName, payload.item || {}));
    }

    if (payload.action === "saveRankingOrder") {
      return jsonResponse(saveRankingOrder(payload.ranking, payload.sheetName, payload.items || []));
    }

    return jsonResponse({ ok: false, error: "Unknown action." });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function webResponse(e, response) {
  const body = {
    source: "boxthislap-next-data",
    callbackId: e && e.parameter && e.parameter.callbackId ? e.parameter.callbackId : "",
    ...response,
  };
  const callback = String(e && e.parameter && e.parameter.callback ? e.parameter.callback : "").trim();

  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(body)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return jsonResponse(body);
}

function getPayload(e) {
  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }

  return JSON.parse(e.postData && e.postData.contents ? e.postData.contents : "{}");
}

function saveNextItem(item) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = getNextSpreadsheet().getSheetByName("Next");

    if (!sheet) {
      throw new Error('Sheet "Next" was not found.');
    }

    const header = findHeaderRow(sheet, "ID");
    const headerValues = sheet.getRange(header.row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const columns = mapColumns(headerValues);
    const rowWidth = headerValues.length;
    const missingColumns = NEXT_ITEM_COLUMNS.filter((column) => !columns[column]);

    if (missingColumns.length > 0) {
      throw new Error(`Next table is missing columns: ${missingColumns.join(", ")}`);
    }

    const rowValues = normalizeNextItem(item);
    const existingRowsById = getExistingRowsById(sheet, header.row, columns.ID);
    const id = rowValues.ID || getNextNumericId(existingRowsById);
    rowValues.ID = id;

    if (!id) {
      throw new Error("ID is required.");
    }

    if (!rowValues.Thing) {
      throw new Error("Thing is required.");
    }

    if (!rowValues.Date) {
      throw new Error("Date is required.");
    }

    const rowNumber = existingRowsById[id];

    if (rowNumber) {
      for (let index = 0; index < NEXT_ITEM_COLUMNS.length; index += 1) {
        const column = NEXT_ITEM_COLUMNS[index];
        sheet.getRange(rowNumber, columns[column]).setValue(rowValues[column]);
      }

      return { ok: true, id, status: "updated" };
    }

    const row = Array(rowWidth).fill("");

    for (const column of NEXT_ITEM_COLUMNS) {
      row[columns[column] - 1] = rowValues[column];
    }

    const startRow = Math.max(sheet.getLastRow() + 1, header.row + 1);
    sheet.getRange(startRow, 1, 1, rowWidth).setValues([row]);

    return { ok: true, id, status: "appended" };
  } finally {
    lock.releaseLock();
  }
}

function getNextNumericId(rowsById) {
  const maxId = Object.keys(rowsById || {}).reduce((maxValue, id) => {
    const numericId = Number(String(id || "").trim());
    return Number.isInteger(numericId) && numericId > maxValue ? numericId : maxValue;
  }, 0);

  return String(maxId + 1);
}

function saveRankingItem(ranking, sheetName, item) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const context = getRankingContext(ranking, sheetName);
    const rows = getRankingRows(context);
    const rowValues = normalizeRankingItem(item, context.nameColumn);
    rowValues.ID = rowValues.ID || getNextRankingNumericId(rows);

    if (!rowValues.Name) {
      throw new Error("Ranking item name is required.");
    }

    const rank = clampRankingRank(rowValues.Rank, rows.length + 1);
    const existingRows = rows.filter((row) => row.ID !== rowValues.ID);
    existingRows.splice(rank - 1, 0, rowValues);
    writeRankingRows(context, normalizeRankingOrder(existingRows));

    return { ok: true, id: rowValues.ID, status: rows.some((row) => row.ID === rowValues.ID) ? "updated" : "appended" };
  } finally {
    lock.releaseLock();
  }
}

function saveRankingOrder(ranking, sheetName, items) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const context = getRankingContext(ranking, sheetName);
    const existingRows = getRankingRows(context);
    const existingRowsById = {};
    existingRows.forEach((row) => {
      existingRowsById[row.ID] = row;
    });
    const orderedIds = items.map((item) => String(item.ID || item.Id || item.id || "").trim()).filter(Boolean);
    const reorderedRows = orderedIds
      .map((id) => existingRowsById[id])
      .filter(Boolean);
    const reorderedIds = {};
    reorderedRows.forEach((row) => {
      reorderedIds[row.ID] = true;
    });
    const remainingRows = existingRows
      .filter((row) => !reorderedIds[row.ID])
      .sort(compareRankingRows);
    const nextRows = normalizeRankingOrder(reorderedRows.concat(remainingRows));

    writeRankingRows(context, nextRows);

    return { ok: true, count: nextRows.length, status: "updated" };
  } finally {
    lock.releaseLock();
  }
}

function getRankingContext(ranking, sheetName) {
  const normalizedRanking = String(ranking || "").trim();
  const resolvedSheetName = RANKING_SHEETS[normalizedRanking] || String(sheetName || "").trim();

  if (!resolvedSheetName) {
    throw new Error("Ranking sheet name is required.");
  }

  const sheet = getNextSpreadsheet().getSheetByName(resolvedSheetName);

  if (!sheet) {
    throw new Error(`Sheet "${resolvedSheetName}" was not found.`);
  }

  const header = findHeaderRow(sheet, "ID");
  const headerValues = sheet.getRange(header.row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const columns = mapColumns(headerValues);

  if (!columns.ID || !columns.Rank) {
    throw new Error(`Ranking table "${resolvedSheetName}" is missing ID or Rank.`);
  }

  const nameColumn = headerValues.find((value) => {
    const key = String(value || "").trim();
    return key && key !== "ID" && key !== "Rank";
  });

  if (!nameColumn || !columns[nameColumn]) {
    throw new Error(`Ranking table "${resolvedSheetName}" is missing a name column.`);
  }

  return {
    columns,
    headerRow: header.row,
    nameColumn,
    rowWidth: headerValues.length,
    sheet,
  };
}

function getRankingRows(context) {
  const lastRow = context.sheet.getLastRow();

  if (lastRow <= context.headerRow) {
    return [];
  }

  const values = context.sheet.getRange(context.headerRow + 1, 1, lastRow - context.headerRow, context.rowWidth).getValues();

  return values
    .map((row, index) => {
      const id = String(row[context.columns.ID - 1] || "").trim();
      const name = String(row[context.columns[context.nameColumn] - 1] || "").trim();

      if (!id && !name) {
        return null;
      }

      return {
        ID: id,
        Name: name,
        Rank: clampRankingRank(row[context.columns.Rank - 1], Number.MAX_SAFE_INTEGER),
        rowNumber: context.headerRow + 1 + index,
      };
    })
    .filter(Boolean)
    .sort(compareRankingRows);
}

function writeRankingRows(context, rows) {
  const lastRow = context.sheet.getLastRow();
  const writeRows = rows.map((row) => {
    const values = Array(context.rowWidth).fill("");
    values[context.columns.ID - 1] = row.ID;
    values[context.columns.Rank - 1] = row.Rank;
    values[context.columns[context.nameColumn] - 1] = row.Name;
    return values;
  });

  if (writeRows.length > 0) {
    context.sheet.getRange(context.headerRow + 1, 1, writeRows.length, context.rowWidth).setValues(writeRows);
  }

  const extraRowCount = lastRow - context.headerRow - writeRows.length;

  if (extraRowCount > 0) {
    context.sheet.getRange(context.headerRow + 1 + writeRows.length, 1, extraRowCount, context.rowWidth).clearContent();
  }
}

function normalizeRankingItem(item, nameColumn) {
  const rawName = item.Name || item.name || item[nameColumn] || "";

  return {
    ID: String(item.ID || item.Id || item.id || "").trim(),
    Name: String(rawName || "").trim(),
    Rank: item.Rank || item.rank || "",
  };
}

function normalizeRankingOrder(rows) {
  return rows.map((row, index) => ({
    ...row,
    Rank: index + 1,
  }));
}

function getNextRankingNumericId(rows) {
  const maxId = rows.reduce((maxValue, row) => {
    const numericId = Number(String(row.ID || "").trim());
    return Number.isInteger(numericId) && numericId > maxValue ? numericId : maxValue;
  }, 0);

  return String(maxId + 1);
}

function clampRankingRank(value, maxRank) {
  const rank = Number(value);

  if (!Number.isInteger(rank) || rank <= 0) {
    return Math.max(1, maxRank);
  }

  return Math.min(rank, Math.max(1, maxRank));
}

function compareRankingRows(first, second) {
  return Number(first.Rank || Number.MAX_SAFE_INTEGER) - Number(second.Rank || Number.MAX_SAFE_INTEGER) ||
    String(first.Name || "").localeCompare(String(second.Name || ""), undefined, { numeric: true }) ||
    String(first.ID || "").localeCompare(String(second.ID || ""), undefined, { numeric: true });
}

function normalizeNextItem(item) {
  return {
    ID: String(item.ID || item.Id || item.id || "").trim(),
    Thing: String(item.Thing || item.thing || "").trim(),
    Date: String(item.Date || item.date || "").trim(),
    "End Date": String(item["End Date"] || item.endDate || "").trim(),
    Time: String(item.Time || item.time || "").trim(),
    "Priority Level": String(item["Priority Level"] || item.priority || "").trim(),
    Completed: normalizeBool(item.Completed || item.completed),
    NonAdmin: normalizeBool(item.NonAdmin || item.nonAdmin),
  };
}

function normalizeBool(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["true", "yes", "y", "1", "checked"].indexOf(normalized) >= 0 ? "TRUE" : "FALSE";
}

function getExistingRowsById(sheet, headerRow, idColumn) {
  const lastRow = sheet.getLastRow();
  const rowsById = {};

  if (lastRow <= headerRow) {
    return rowsById;
  }

  const values = sheet.getRange(headerRow + 1, idColumn, lastRow - headerRow, 1).getValues();

  values.forEach((row, index) => {
    const id = String(row[0] || "").trim();

    if (id) {
      rowsById[id] = headerRow + 1 + index;
    }
  });

  return rowsById;
}

function findHeaderRow(sheet, requiredColumn) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const scanRows = Math.min(lastRow, 25);
  const values = sheet.getRange(1, 1, scanRows, lastColumn).getValues();

  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const columns = mapColumns(values[rowIndex]);

    if (columns[requiredColumn]) {
      return { row: rowIndex + 1, columns };
    }
  }

  throw new Error(`Could not find header row with "${requiredColumn}".`);
}

function mapColumns(headerValues) {
  const columns = {};

  headerValues.forEach((value, index) => {
    const key = String(value || "").trim();

    if (key) {
      columns[key] = index + 1;
    }
  });

  return columns;
}

function getNextSpreadsheet() {
  const configuredId = PropertiesService.getScriptProperties().getProperty("NEXT_DATA_SPREADSHEET_ID") ||
    NEXT_DATA_SPREADSHEET_ID;

  if (configuredId) {
    return SpreadsheetApp.openById(configuredId);
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (spreadsheet) {
    return spreadsheet;
  }

  throw new Error("Set NEXT_DATA_SPREADSHEET_ID or deploy this script bound to the Next workbook.");
}

function jsonResponse(response) {
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
