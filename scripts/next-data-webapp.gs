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
    const id = rowValues.ID;

    if (!id) {
      throw new Error("ID is required.");
    }

    if (!rowValues.Thing) {
      throw new Error("Thing is required.");
    }

    if (!rowValues.Date) {
      throw new Error("Date is required.");
    }

    const existingRowsById = getExistingRowsById(sheet, header.row, columns.ID);
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
