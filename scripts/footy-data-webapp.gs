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
const FOOTY_MATCH_NOTE_COLUMNS = [
  "Match ID",
  "Home Score",
  "Away Score",
  "Follow G/A",
  "Opp G/A",
  "Note",
  "Highlight Link",
];

function doGet(e) {
  try {
    const action = String(e && e.parameter && e.parameter.action ? e.parameter.action : "").trim();

    if (action === "listFootyMatchNotes") {
      return webResponse(e, { ok: true, notes: listFootyMatchNotes() });
    }

    return webResponse(e, { ok: true, service: "boxthislap-footy-data" });
  } catch (error) {
    return webResponse(e, { ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function doPost(e) {
  try {
    const payload = getPayload(e);

    if (payload.action === "syncFootyMatches") {
      return jsonResponse(syncFootyMatches(payload.matches || []));
    }

    if (payload.action === "saveFootyMatchNote") {
      return jsonResponse(saveFootyMatchNote(payload.note || {}));
    }

    return jsonResponse({ ok: false, error: "Unknown action." });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function webResponse(e, response) {
  const body = {
    source: "boxthislap-footy-data",
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

function saveFootyMatchNote(note) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = getFootySpreadsheet().getSheetByName("Match Notes");

    if (!sheet) {
      throw new Error('Sheet "Match Notes" was not found.');
    }

    const header = findHeaderRow(sheet, "Match ID");
    const headerValues = sheet.getRange(header.row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const columns = mapColumns(headerValues);
    const rowWidth = headerValues.length;
    const missingColumns = FOOTY_MATCH_NOTE_COLUMNS.filter((column) => !columns[column]);

    if (missingColumns.length > 0) {
      throw new Error(`Match Notes table is missing columns: ${missingColumns.join(", ")}`);
    }

    const matchId = String(note["Match ID"] || note.matchId || "").trim();

    if (!matchId) {
      throw new Error("Match ID is required.");
    }

    const rowValues = normalizeFootyMatchNote(note);
    const existingRowsByMatchId = getExistingRowsByMatchId(sheet, header.row, columns["Match ID"]);
    const rowNumber = existingRowsByMatchId[matchId];

    if (rowNumber) {
      for (let index = 0; index < FOOTY_MATCH_NOTE_COLUMNS.length; index += 1) {
        sheet.getRange(rowNumber, columns[FOOTY_MATCH_NOTE_COLUMNS[index]]).setValue(rowValues[FOOTY_MATCH_NOTE_COLUMNS[index]]);
      }

      return { ok: true, matchId, status: "updated" };
    }

    const row = Array(rowWidth).fill("");

    for (const column of FOOTY_MATCH_NOTE_COLUMNS) {
      row[columns[column] - 1] = rowValues[column];
    }

    const startRow = Math.max(sheet.getLastRow() + 1, header.row + 1);
    sheet.getRange(startRow, 1, 1, rowWidth).setValues([row]);

    return { ok: true, matchId, status: "appended" };
  } finally {
    lock.releaseLock();
  }
}

function listFootyMatchNotes() {
  const sheet = getFootySpreadsheet().getSheetByName("Match Notes");

  if (!sheet) {
    throw new Error('Sheet "Match Notes" was not found.');
  }

  const header = findHeaderRow(sheet, "Match ID");
  const headerValues = sheet.getRange(header.row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const columns = mapColumns(headerValues);
  const missingColumns = FOOTY_MATCH_NOTE_COLUMNS.filter((column) => !columns[column]);

  if (missingColumns.length > 0) {
    throw new Error(`Match Notes table is missing columns: ${missingColumns.join(", ")}`);
  }

  const lastRow = sheet.getLastRow();

  if (lastRow <= header.row) {
    return [];
  }

  const values = sheet.getRange(header.row + 1, 1, lastRow - header.row, sheet.getLastColumn()).getValues();

  return values
    .map((row) => normalizeFootyMatchNoteFromRow(row, columns))
    .filter((note) => note.matchId);
}

function normalizeFootyMatchNoteFromRow(row, columns) {
  return {
    matchId: String(row[columns["Match ID"] - 1] || "").trim(),
    homeScore: String(row[columns["Home Score"] - 1] || "").trim(),
    awayScore: String(row[columns["Away Score"] - 1] || "").trim(),
    followGoalAssists: parseGoalAssistEvents(row[columns["Follow G/A"] - 1]),
    opponentGoalAssists: parseGoalAssistEvents(row[columns["Opp G/A"] - 1]),
    note: String(row[columns["Note"] - 1] || "").trim(),
    highlightLink: String(row[columns["Highlight Link"] - 1] || "").trim(),
  };
}

function normalizeFootyMatchNote(note) {
  const followGoalAssists = note["Follow G/A"] || note.followGoalAssists || [];
  const opponentGoalAssists = note["Opp G/A"] || note.opponentGoalAssists || [];

  return {
    "Match ID": String(note["Match ID"] || note.matchId || "").trim(),
    "Home Score": String(note["Home Score"] || note.homeScore || "").trim(),
    "Away Score": String(note["Away Score"] || note.awayScore || "").trim(),
    "Follow G/A": serializeGoalAssistEvents(followGoalAssists),
    "Opp G/A": serializeGoalAssistEvents(opponentGoalAssists),
    "Note": String(note.Note || note.note || "").trim(),
    "Highlight Link": String(note["Highlight Link"] || note.highlightLink || "").trim(),
  };
}

function serializeGoalAssistEvents(value) {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map(normalizeGoalAssistEvent));
  }

  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return JSON.stringify(parsed.map(normalizeGoalAssistEvent));
    }
  } catch {
    // Keep manually-entered text rather than rejecting the whole save.
  }

  return text;
}

function parseGoalAssistEvents(value) {
  const text = String(value || "").trim();

  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed.map(normalizeGoalAssistEvent);
    }
  } catch {
    return [];
  }

  return [];
}

function normalizeGoalAssistEvent(event) {
  return {
    scorer: String(event && event.scorer ? event.scorer : "").trim(),
    assister: String(event && event.assister ? event.assister : "").trim(),
    penalty: Boolean(event && event.penalty),
    minute: event && event.minute !== undefined && event.minute !== null ? event.minute : "",
  };
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
