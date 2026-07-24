const FOOTY_DATA_SPREADSHEET_ID = "10t5zr-2vM12MRLn1l58STCfJjlUZOGalzEOx-DgCpEQ";

const FOOTY_MATCH_COLUMNS = [
  "Match ID",
  "Date",
  "Time",
  "Followed Team",
  "Home",
  "Away",
  "Competition",
  "Source IDs",
  "Last Seen",
];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : "{}");

    if (payload.action === "syncFootyMatches") {
      return jsonResponse(syncFootyMatches(payload.matches || []));
    }

    return jsonResponse({ ok: false, error: "Unknown action." });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function syncFootyMatches(matches) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = getFootySpreadsheet().getSheetByName("Matches");

    if (!sheet) {
      throw new Error('Sheet "Matches" was not found.');
    }

    const header = findHeaderRow(sheet, "Match ID");
    const headerValues = sheet.getRange(header.row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const columns = mapColumns(headerValues);
    const rowWidth = headerValues.length;
    const missingColumns = FOOTY_MATCH_COLUMNS.filter((column) => !columns[column]);

    if (missingColumns.length > 0) {
      throw new Error(`Footy Matches table is missing columns: ${missingColumns.join(", ")}`);
    }

    const existingRowsByMatchId = getExistingRowsByMatchId(sheet, header.row, columns["Match ID"]);
    const rowsToAppend = [];
    let updated = 0;

    for (const match of matches) {
      const matchId = String(match["Match ID"] || "").trim();

      if (!matchId) {
        continue;
      }

      const rowNumber = existingRowsByMatchId[matchId];
      const rowValues = FOOTY_MATCH_COLUMNS.map((column) => String(match[column] || ""));

      if (rowNumber) {
        for (let index = 0; index < FOOTY_MATCH_COLUMNS.length; index += 1) {
          sheet.getRange(rowNumber, columns[FOOTY_MATCH_COLUMNS[index]]).setValue(rowValues[index]);
        }
        updated += 1;
      } else {
        rowsToAppend.push(buildSheetRow(match, columns, rowWidth));
      }
    }

    if (rowsToAppend.length > 0) {
      const startRow = Math.max(sheet.getLastRow() + 1, header.row + 1);
      sheet.getRange(startRow, 1, rowsToAppend.length, rowWidth).setValues(rowsToAppend);
    }

    return {
      ok: true,
      appended: rowsToAppend.length,
      updated,
    };
  } finally {
    lock.releaseLock();
  }
}

function buildSheetRow(match, columns, rowWidth) {
  const row = Array(rowWidth).fill("");

  for (const column of FOOTY_MATCH_COLUMNS) {
    row[columns[column] - 1] = String(match[column] || "");
  }

  return row;
}

function getFootySpreadsheet() {
  const configuredId = PropertiesService.getScriptProperties().getProperty("FOOTY_DATA_SPREADSHEET_ID") ||
    FOOTY_DATA_SPREADSHEET_ID;

  if (configuredId) {
    return SpreadsheetApp.openById(configuredId);
  }

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!activeSpreadsheet) {
    throw new Error("Set FOOTY_DATA_SPREADSHEET_ID or deploy this script bound to the Footy workbook.");
  }

  return activeSpreadsheet;
}

function findHeaderRow(sheet, requiredColumn) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  for (let row = 1; row <= lastRow; row += 1) {
    const values = sheet.getRange(row, 1, 1, lastColumn).getValues()[0].map((value) => String(value || "").trim());

    if (values.includes(requiredColumn)) {
      return { row, values };
    }
  }

  throw new Error(`Could not find a table header containing "${requiredColumn}".`);
}

function mapColumns(headerValues) {
  return headerValues.reduce((columns, value, index) => {
    const name = String(value || "").trim();

    if (name) {
      columns[name] = index + 1;
    }

    return columns;
  }, {});
}

function getExistingRowsByMatchId(sheet, headerRow, matchIdColumn) {
  const lastRow = sheet.getLastRow();
  const rowsByMatchId = {};

  if (lastRow <= headerRow) {
    return rowsByMatchId;
  }

  const values = sheet.getRange(headerRow + 1, matchIdColumn, lastRow - headerRow, 1).getValues();

  for (let index = 0; index < values.length; index += 1) {
    const matchId = String(values[index][0] || "").trim();

    if (matchId) {
      rowsByMatchId[matchId] = headerRow + 1 + index;
    }
  }

  return rowsByMatchId;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
