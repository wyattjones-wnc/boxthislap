const BRACKET_PICKS_SPREADSHEET_ID = "1BPF3QrqPf1ok_x_W9hIJzFgozLAO1yX4Iu5vssoPIF4";
const BRACKET_PICKS_SHEET_ID = 1943594150;
const MANAGER_PORTAL_SPREADSHEET_ID = "";
const MANAGER_AUTH_SHEET_NAMES = [
  "Manager Auth",
  "Managers Private",
  "PRIVATE - IF AGENT CAN SEE ALERT",
];
const BRACKET_PICKS_HEADERS = [
  "Timestamp",
  "Submitter",
  "Picks JSON",
  "Page URL",
  "User Agent",
];

function doPost(event) {
  const payload = parseBracketPayload_(event);

  if (payload.action === "login" || payload.action === "setupPassphrase") {
    return handleManagerAuth_(payload);
  }

  const sheet = getBracketPicksSheet_();

  ensureBracketPicksHeaders_(sheet);

  sheet.appendRow([
    new Date(),
    payload.submitter || "",
    JSON.stringify(payload.picks || []),
    payload.pageUrl || "",
    payload.browser || "",
  ]);

  return createPortalResponse_(payload, { ok: true });
}

function getBracketPicksSheet_() {
  const spreadsheet = SpreadsheetApp.openById(BRACKET_PICKS_SPREADSHEET_ID);
  const sheets = spreadsheet.getSheets();
  const sheet = sheets.find((entry) => entry.getSheetId() === BRACKET_PICKS_SHEET_ID);

  if (!sheet) {
    throw new Error(`Could not find sheet with gid ${BRACKET_PICKS_SHEET_ID}`);
  }

  return sheet;
}

function parseBracketPayload_(event) {
  const text = event?.parameter?.payload || event?.postData?.contents || "{}";

  try {
    return JSON.parse(text);
  } catch (error) {
    return {};
  }
}

function ensureBracketPicksHeaders_(sheet) {
  const existingHeaders = sheet
    .getRange(1, 1, 1, BRACKET_PICKS_HEADERS.length)
    .getValues()[0]
    .map((value) => String(value || "").trim());

  if (existingHeaders.some(Boolean)) {
    return;
  }

  sheet.getRange(1, 1, 1, BRACKET_PICKS_HEADERS.length).setValues([BRACKET_PICKS_HEADERS]);
}

function handleManagerAuth_(payload) {
  try {
    const managerId = String(payload.managerId || "").trim();
    const passphrase = String(payload.passphrase || "");

    if (!managerId || !passphrase) {
      return createPortalResponse_(payload, { ok: false, error: "Manager and passphrase are required." });
    }

    const sheet = getManagerAuthSheet_();
    const table = readSheetTable_(sheet);
    const idColumn = findColumn_(table.headers, ["Manager ID", "ID"]);
    const passphraseColumn = findColumn_(table.headers, ["Passphrase", "Passcode"]);
    const displayNameColumn = findColumn_(table.headers, ["Display Name", "Name"]);

    if (idColumn < 0 || passphraseColumn < 0) {
      return createPortalResponse_(payload, { ok: false, error: "Manager auth sheet needs Manager ID and Passphrase columns." });
    }

    const rowIndex = table.rows.findIndex((row) => String(row[idColumn] || "").trim() === managerId);

    if (rowIndex < 0) {
      return createPortalResponse_(payload, { ok: false, error: "Manager was not found in the auth sheet." });
    }

    const row = table.rows[rowIndex];
    const storedPassphrase = String(row[passphraseColumn] || "");

    if (payload.action === "setupPassphrase") {
      if (storedPassphrase) {
        return createPortalResponse_(payload, { ok: false, error: "A passphrase already exists for this manager." });
      }

      sheet.getRange(rowIndex + 2, passphraseColumn + 1).setValue(passphrase);

      return createPortalResponse_(payload, {
        ok: true,
        managerId,
        displayName: displayNameColumn >= 0 ? row[displayNameColumn] : "",
      });
    }

    if (storedPassphrase !== passphrase) {
      return createPortalResponse_(payload, { ok: false, error: "Passphrase did not match." });
    }

    return createPortalResponse_(payload, {
      ok: true,
      managerId,
      displayName: displayNameColumn >= 0 ? row[displayNameColumn] : "",
    });
  } catch (error) {
    return createPortalResponse_(payload, { ok: false, error: error.message });
  }
}

function getManagerAuthSheet_() {
  const spreadsheet = getManagerPortalSpreadsheet_();

  for (const sheetName of MANAGER_AUTH_SHEET_NAMES) {
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (sheet) {
      return sheet;
    }
  }

  throw new Error(`Could not find manager auth sheet. Expected one of: ${MANAGER_AUTH_SHEET_NAMES.join(", ")}`);
}

function getManagerPortalSpreadsheet_() {
  if (MANAGER_PORTAL_SPREADSHEET_ID) {
    return SpreadsheetApp.openById(MANAGER_PORTAL_SPREADSHEET_ID);
  }

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (activeSpreadsheet) {
    return activeSpreadsheet;
  }

  throw new Error("Set MANAGER_PORTAL_SPREADSHEET_ID or deploy this script bound to the manager portal workbook.");
}

function readSheetTable_(sheet) {
  const values = sheet.getDataRange().getValues();

  if (values.length === 0) {
    return { headers: [], rows: [] };
  }

  return {
    headers: values[0].map((value) => String(value || "").trim()),
    rows: values.slice(1),
  };
}

function findColumn_(headers, candidates) {
  const normalizedCandidates = candidates.map((candidate) => normalizeHeader_(candidate));

  return headers.findIndex((header) => normalizedCandidates.includes(normalizeHeader_(header)));
}

function normalizeHeader_(value) {
  return String(value || "").trim().toLowerCase();
}

function createPortalResponse_(payload, response) {
  const body = {
    source: "boxthislap-manager-portal",
    callbackId: payload.callbackId || "",
    ...response,
  };
  const script = `
    <!doctype html>
    <html>
      <body>
        <script>
          parent.postMessage(${JSON.stringify(body)}, "*");
        </script>
      </body>
    </html>
  `;

  return HtmlService
    .createHtmlOutput(script)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
