const TAB_NAMES = ['Rounds', 'Sessions', 'Session Results', 'Weekly Picks', 'Weekly Scores'];

function doPost(event) {
  try {
    const expectedKey = PropertiesService.getScriptProperties().getProperty('BOX_THIS_LAP_EXPORT_KEY');
    const payload = JSON.parse(event.postData.contents || '{}');
    if (!expectedKey || payload.exportKey !== expectedKey) return jsonResponse({ ok: false, error: 'Unauthorized.' });
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('BOX_THIS_LAP_EXPORT_SPREADSHEET_ID');
    const workbook = SpreadsheetApp.openById(spreadsheetId);
    writeObjects(workbook, TAB_NAMES[0], payload.rounds || []);
    writeObjects(workbook, TAB_NAMES[1], payload.sessions || []);
    writeObjects(workbook, TAB_NAMES[2], payload.results || []);
    writeObjects(workbook, TAB_NAMES[3], payload.entries || []);
    writeObjects(workbook, TAB_NAMES[4], payload.scores || []);
    return jsonResponse({ ok: true, spreadsheetUrl: workbook.getUrl() });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function writeObjects(workbook, name, rows) {
  const sheet = workbook.getSheetByName(name) || workbook.insertSheet(name);
  sheet.clearContents();
  if (!rows.length) return;
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const values = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))];
  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
