const GUIDES_SPREADSHEET_ID = "1q0KbexN8ZMsKALO8TO9UlCl0Z41yDAFaFeo0ZY8leP0";
const WALKTHROUGH_CHECKLIST_COLUMNS = ["ID", "Guide ID", "Step ID", "Done"];

function doGet() {
  return jsonResponse({ ok: true, service: "boxthislap-guides-data" });
}

function doPost(event) {
  try {
    const payload = getPayload(event);

    if (payload.action === "saveWalkthroughChecklistDone") {
      return jsonResponse(saveWalkthroughChecklistDone(payload.item || {}));
    }

    return jsonResponse({ ok: false, error: "Unknown action." });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function getPayload(event) {
  if (event && event.parameter && event.parameter.payload) {
    return JSON.parse(event.parameter.payload);
  }

  return JSON.parse(event && event.postData && event.postData.contents ? event.postData.contents : "{}");
}

function saveWalkthroughChecklistDone(item) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = getGuidesSpreadsheet().getSheetByName("WalkthroughChecklist");

    if (!sheet) {
      throw new Error('Sheet "WalkthroughChecklist" was not found.');
    }

    const header = findHeaderRow(sheet, "ID");
    const headerValues = sheet.getRange(header.row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const columns = mapColumns(headerValues);
    const missingColumns = WALKTHROUGH_CHECKLIST_COLUMNS.filter((column) => !columns[column]);

    if (missingColumns.length > 0) {
      throw new Error(`WalkthroughChecklist table is missing columns: ${missingColumns.join(", ")}`);
    }

    const id = String(item.ID || item.id || "").trim();
    const guideId = String(item["Guide ID"] || item.guideId || "").trim();
    const stepId = String(item["Step ID"] || item.stepId || "").trim();

    if (!id || !guideId || !stepId) {
      throw new Error("ID, Guide ID, and Step ID are required.");
    }

    const lastRow = sheet.getLastRow();

    if (lastRow <= header.row) {
      throw new Error("WalkthroughChecklist has no data rows.");
    }

    const values = sheet.getRange(
      header.row + 1,
      1,
      lastRow - header.row,
      sheet.getLastColumn()
    ).getDisplayValues();
    const idRows = [];
    const pairRows = [];

    values.forEach((row, index) => {
      const rowNumber = header.row + 1 + index;
      const rowId = String(row[columns.ID - 1] || "").trim();
      const rowGuideId = String(row[columns["Guide ID"] - 1] || "").trim();
      const rowStepId = String(row[columns["Step ID"] - 1] || "").trim();

      if (rowId === id) {
        idRows.push(rowNumber);
      }

      if (rowGuideId === guideId && rowStepId === stepId) {
        pairRows.push(rowNumber);
      }
    });

    if (idRows.length > 1) {
      throw new Error(`WalkthroughChecklist ID ${id} is not unique.`);
    }

    if (pairRows.length > 1) {
      throw new Error(`WalkthroughChecklist Guide ID ${guideId} and Step ID ${stepId} pair is not unique.`);
    }

    if (idRows.length === 0) {
      throw new Error(`WalkthroughChecklist item ${id} was not found.`);
    }

    if (pairRows.length !== 1 || idRows[0] !== pairRows[0]) {
      throw new Error(`WalkthroughChecklist ID ${id} does not match Guide ID ${guideId} and Step ID ${stepId}.`);
    }

    const done = normalizeBoolean(item.Done === undefined ? item.done : item.Done);
    sheet.getRange(idRows[0], columns.Done).setValue(done);
    SpreadsheetApp.flush();

    return {
      done,
      guideId,
      id,
      ok: true,
      status: "updated",
      stepId,
    };
  } finally {
    lock.releaseLock();
  }
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

function normalizeBoolean(value) {
  const normalized = String(value === true ? "true" : value || "").trim().toLowerCase();
  return ["true", "yes", "y", "1", "checked", "done", "complete", "completed"].includes(normalized);
}

function getGuidesSpreadsheet() {
  const configuredId = PropertiesService.getScriptProperties().getProperty("GUIDES_SPREADSHEET_ID");

  if (configuredId) {
    return SpreadsheetApp.openById(configuredId);
  }

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (activeSpreadsheet) {
    return activeSpreadsheet;
  }

  return SpreadsheetApp.openById(GUIDES_SPREADSHEET_ID);
}

function jsonResponse(response) {
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
