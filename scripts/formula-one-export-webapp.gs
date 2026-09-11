const MAIN_TABS = [
  ['Main Data', 'mainData'],
  ['Round Summary', 'roundSummary'],
  ['Teammate Comparisons', 'teammateComparisons'],
  ['Sprint Data', 'sprintData'],
  ['Sprint Summary', 'sprintSummary'],
  ['Rounds', 'rounds'],
  ['Drivers', 'drivers'],
  ['Sessions', 'sessions'],
  ['Session Results', 'results'],
];
const WEEKLY_TABS = [
  ['Weekly Picks', 'entries'],
  ['Weekly Scores', 'scores'],
  ['Weekly Standings', 'standings'],
  ['Wildcard Scoring', 'wildcardScoring'],
  ['Podium Scoring', 'podiumScoring'],
];

function doPost(event) {
  try {
    const expectedKey = PropertiesService.getScriptProperties().getProperty('BOX_THIS_LAP_EXPORT_KEY');
    const payload = JSON.parse(event.postData.contents || '{}');
    if (!expectedKey || payload.exportKey !== expectedKey) return jsonResponse({ ok: false, error: 'Unauthorized.' });
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('BOX_THIS_LAP_EXPORT_SPREADSHEET_ID');
    const workbook = SpreadsheetApp.openById(spreadsheetId);
    const year = Number(payload.year);
    if (!Number.isInteger(year)) throw new Error('A valid export year is required.');
    const tabs = payload.dataset === 'weekly' ? WEEKLY_TABS : MAIN_TABS;
    tabs.forEach(([label, key]) => writeObjects(workbook, `${year} ${label}`, payload[key] || []));
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
