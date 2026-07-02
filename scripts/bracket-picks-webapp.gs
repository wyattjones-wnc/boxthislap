const BRACKET_PICKS_SHEET_ID = 1943594150;
const BRACKET_PICKS_HEADERS = [
  "Timestamp",
  "Submitter",
  "Picks JSON",
  "Page URL",
  "User Agent",
];

function doPost(event) {
  const sheet = getBracketPicksSheet_();
  const payload = parseBracketPayload_(event);

  ensureBracketPicksHeaders_(sheet);

  sheet.appendRow([
    new Date(),
    payload.submitter || "",
    JSON.stringify(payload.picks || []),
    payload.pageUrl || "",
    payload.browser || "",
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getBracketPicksSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = spreadsheet.getSheets();
  const sheet = sheets.find((entry) => entry.getSheetId() === BRACKET_PICKS_SHEET_ID);

  if (!sheet) {
    throw new Error(`Could not find sheet with gid ${BRACKET_PICKS_SHEET_ID}`);
  }

  return sheet;
}

function parseBracketPayload_(event) {
  const text = event?.postData?.contents || "{}";

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
