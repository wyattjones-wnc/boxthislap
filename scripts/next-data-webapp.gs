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
const TODO_ITEM_COLUMNS = [
  "ID",
  "Order",
  "Name",
  "Low Hour",
  "High Hour",
  "Parent ID",
  "Started",
  "Archived",
  "Platinum Cleanup",
  "Completed",
  "IsDeleted",
  "Unpurchased",
  "Image URL",
];
const WANT_ITEM_COLUMNS = ["ID", "Order", "Name", "Price", "Archived", "Completed", "IsDeleted", "Image URL"];
const RANKING_SHEETS = {
  games: "VG Ranking",
  mcu: "MCU Ranking",
  movies: "Movie Ranking",
  tv: "TV Ranking",
};
const RANKING_TYPES = {
  games: "games",
  mcu: "mcu",
  movies: "movies",
  tv: "tv",
};
const RANKING_CHOICE_COLUMNS = [
  "ID",
  "Ranking Type",
  "Item A ID",
  "Item B ID",
  "Winner ID",
  "Loser ID",
  "Manager ID",
  "Created At",
];
const RANKING_ELO_COLUMNS = [
  "ID",
  "Ranking Type",
  "Item ID",
  "Manager ID",
  "Rating",
  "Wins",
  "Losses",
  "Last Choice ID",
  "Updated At",
];
const TODO_CHOICE_SHEET = "To Do Choices";
const TODO_ELO_SHEET = "To Do Elo";
const TODO_SEED_SHEET = "To Do Seeds";
const TODO_SNAPSHOT_SHEET = "To Do Snapshots";
const TODO_SNAPSHOT_ITEM_SHEET = "To Do Snapshot Items";
const WANT_CHOICE_SHEET = "Want Choices";
const WANT_ELO_SHEET = "Want Elo";
const WANT_SEED_SHEET = "Want Seeds";
const WANT_SNAPSHOT_SHEET = "Want Snapshots";
const WANT_SNAPSHOT_ITEM_SHEET = "Want Snapshot Items";
const TODO_CHOICE_COLUMNS = ["ID", "Item A ID", "Item B ID", "Winner ID", "Loser ID", "Created At"];
const TODO_ELO_COLUMNS = ["ID", "Item ID", "Rating", "Wins", "Losses", "Last Choice ID", "Updated At"];
const TODO_SEED_COLUMNS = ["ID", "Item ID", "Seed Rank", "Seed Rating", "Seeded At", "Reason"];
const TODO_SNAPSHOT_COLUMNS = ["Snapshot ID", "Created At", "Label", "Reason", "Source"];
const TODO_SNAPSHOT_ITEM_COLUMNS = ["Snapshot ID", "Item ID", "Item Name", "Rank", "Rating", "Wins", "Losses", "Games"];
const RANKING_SEED_COLUMNS = [
  "Ranking Type",
  "Item ID",
  "Seed Rank",
  "Seed Rating",
  "Seeded At",
  "Reason",
];
const RANKING_EXCLUSION_COLUMNS = [
  "ID",
  "Ranking Type",
  "Item ID",
  "Manager ID",
  "Excluded",
  "Updated At",
];
const RANKING_SNAPSHOT_COLUMNS = [
  "Snapshot ID",
  "Ranking Type",
  "Manager ID",
  "Created At",
  "Label",
  "Reason",
  "Source",
];
const RANKING_SNAPSHOT_ITEM_COLUMNS = [
  "Snapshot ID",
  "Item ID",
  "Item Name",
  "Rank",
  "Rating",
  "Wins",
  "Losses",
  "Games",
];
const RANKING_BASE_RATING = 1500;
const RANKING_ELO_K_FACTOR = 32;
const RANKING_PROVISIONAL_COMPARISONS = 10;
const RANKING_PROVISIONAL_K_FACTOR = 64;

function doGet(e) {
  try {
    const action = String(e && e.parameter && e.parameter.action ? e.parameter.action : "").trim();

    if (action === "listRankingChoices") {
      return webResponse(e, { ok: true, choices: listRankingChoices(e.parameter.managerId) });
    }

    if (action === "listRankingElo") {
      return webResponse(e, { ok: true, elo: listRankingElo(e.parameter.managerId) });
    }

    if (action === "repairRankingEloDuplicateManagers") {
      return webResponse(e, repairRankingEloDuplicateManagers({
        fromManagerId: e.parameter.fromManagerId || "6",
        toManagerId: e.parameter.toManagerId || "8",
      }));
    }

    if (action === "listRankingSeeds") {
      return webResponse(e, { ok: true, seeds: listRankingSeeds() });
    }

    if (action === "listRankingExclusions") {
      return webResponse(e, { ok: true, exclusions: listRankingExclusions() });
    }

    if (action === "saveRankingExclusion") {
      return webResponse(e, saveRankingExclusion({
        Excluded: e.parameter.excluded,
        ID: e.parameter.id,
        "Item ID": e.parameter.itemId,
        "Manager ID": e.parameter.managerId,
        "Ranking Type": e.parameter.rankingType,
        "Updated At": e.parameter.updatedAt,
      }));
    }

    if (action === "listRankingSnapshots") {
      return webResponse(e, {
        ok: true,
        snapshotItems: listRankingSnapshotItems(),
        snapshots: listRankingSnapshots(),
      });
    }

    if (action === "listNextItems") {
      return webResponse(e, { ok: true, items: listNextItems() });
    }

    if (action === "listTodoChoices") {
      return webResponse(e, { ok: true, choices: listTodoChoices() });
    }

    if (action === "listTodoElo") {
      return webResponse(e, { ok: true, elo: listTodoElo() });
    }

    if (action === "listTodoRankingMeta") {
      return webResponse(e, {
        ok: true,
        seeds: listTodoSeeds(),
        snapshotItems: listTodoSnapshotItems(),
        snapshots: listTodoSnapshots(),
      });
    }

    if (action === "listTodoItems") {
      return webResponse(e, { ok: true, items: listTodoItems() });
    }

    if (action === "listWantChoices") return webResponse(e, { ok: true, choices: listWantChoices() });
    if (action === "listWantElo") return webResponse(e, { ok: true, elo: listWantElo() });
    if (action === "listWantRankingMeta") return webResponse(e, { ok: true, seeds: listWantSeeds(), snapshotItems: listWantSnapshotItems(), snapshots: listWantSnapshots() });
    if (action === "listWantItems") return webResponse(e, { ok: true, items: listWantItems() });

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

    if (payload.action === "saveTodoItem") {
      return jsonResponse(saveTodoItem(payload.item || {}));
    }

    if (payload.action === "saveTodoOrder") {
      return jsonResponse(saveTodoOrder(payload.items || []));
    }

    if (payload.action === "saveWantItem") return jsonResponse(saveWantItem(payload.item || {}));
    if (payload.action === "saveWantOrder") return jsonResponse(saveWantOrder(payload.items || []));
    if (payload.action === "moveWantToTodo") return jsonResponse(moveWantToTodo(payload.itemId));

    if (payload.action === "saveRankingItem") {
      return jsonResponse(saveRankingItem(
        payload.ranking,
        payload.sheetName,
        payload.item || {},
        payload.seed || null,
        payload.normalization || null
      ));
    }

    if (payload.action === "saveRankingOrder") {
      return jsonResponse(saveRankingOrder(payload.ranking, payload.sheetName, payload.items || []));
    }

    if (payload.action === "saveRankingChoice") {
      return jsonResponse(saveRankingChoice(payload.choice || {}));
    }

    if (payload.action === "saveTodoChoice") {
      return jsonResponse(saveTodoChoice(payload.choice || {}));
    }

    if (payload.action === "saveWantChoice") return jsonResponse(saveWantChoice(payload.choice || {}));
    if (payload.action === "normalizeWant") return jsonResponse(normalizeWant(payload.normalization || {}));

    if (payload.action === "normalizeTodo") {
      return jsonResponse(normalizeTodo(payload.normalization || {}));
    }

    if (payload.action === "saveRankingExclusion") {
      return jsonResponse(saveRankingExclusion(payload.exclusion || {}));
    }

    if (payload.action === "normalizeRanking") {
      return jsonResponse(normalizeRanking(payload.normalization || {}));
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
    const savedColumns = columns["Image URL"]
      ? NEXT_ITEM_COLUMNS.concat(["Image URL"])
      : NEXT_ITEM_COLUMNS;
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
      for (let index = 0; index < savedColumns.length; index += 1) {
        const column = savedColumns[index];
        sheet.getRange(rowNumber, columns[column]).setValue(rowValues[column]);
      }

      return { ok: true, id, status: "updated" };
    }

    const row = Array(rowWidth).fill("");

    for (const column of savedColumns) {
      row[columns[column] - 1] = rowValues[column];
    }

    const startRow = Math.max(sheet.getLastRow() + 1, header.row + 1);
    sheet.getRange(startRow, 1, 1, rowWidth).setValues([row]);

    return { ok: true, id, status: "appended" };
  } finally {
    lock.releaseLock();
  }
}

function listNextItems() {
  const context = getSimpleTableContext("Next", NEXT_ITEM_COLUMNS, "ID");

  return readSimpleTableDisplayRows(context)
    .map((row) => ({
      id: String(row.ID || "").trim(),
      thing: String(row.Thing || "").trim(),
      date: String(row.Date || "").trim(),
      endDate: String(row["End Date"] || "").trim(),
      time: String(row.Time || "").trim(),
      priorityLevel: String(row["Priority Level"] || "").trim(),
      completed: isTrueValue(row.Completed),
      nonAdmin: isTrueValue(row.NonAdmin),
      imageUrl: String(row["Image URL"] || "").trim(),
    }))
    .filter((row) => row.id && row.thing && row.date);
}

function saveTodoItem(item) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const context = getSimpleTableContext("To Do", TODO_ITEM_COLUMNS, "ID");
    const rows = getTodoRows(context);
    const rowValues = normalizeTodoItem(item);
    rowValues.ID = rowValues.ID || getNextNumericIdFromRows(rows, "ID");

    if (!rowValues.ID) {
      throw new Error("ID is required.");
    }

    if (!rowValues.Name) {
      throw new Error("Name is required.");
    }

    const existingRows = rows.filter((row) => row.ID !== rowValues.ID);
    const nextRows = existingRows.concat([rowValues]);
    writeTodoRows(context, normalizeTodoOrder(nextRows, {
      movedId: rowValues.ID,
      requestedOrder: rowValues.Order,
    }));

    return {
      ok: true,
      id: rowValues.ID,
      status: rows.some((row) => row.ID === rowValues.ID) ? "updated" : "appended",
    };
  } finally {
    lock.releaseLock();
  }
}

function saveTodoOrder(items) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const context = getSimpleTableContext("To Do", TODO_ITEM_COLUMNS, "ID");
    const existingRows = getTodoRows(context);
    const existingRowsById = {};
    existingRows.forEach((row) => {
      existingRowsById[row.ID] = row;
    });

    const orderedIds = items
      .map((item) => String(item.ID || item.Id || item.id || "").trim())
      .filter(Boolean);
    const existingOrderableRows = getTodoDefaultOrderRows(existingRows);
    const existingOrderableIds = {};
    existingOrderableRows.forEach((row) => {
      existingOrderableIds[row.ID] = true;
    });
    const reorderedRows = orderedIds
      .map((id) => existingRowsById[id])
      .filter((row) => row && existingOrderableIds[row.ID]);
    const reorderedIds = {};
    reorderedRows.forEach((row) => {
      reorderedIds[row.ID] = true;
    });
    const remainingOrderableRows = existingOrderableRows
      .filter((row) => !reorderedIds[row.ID])
      .sort(compareTodoRows);
    const nextRows = normalizeTodoOrder(existingRows, {
      orderedRows: reorderedRows.concat(remainingOrderableRows),
    });

    writeTodoRows(context, nextRows);

    return { ok: true, count: nextRows.length, status: "updated" };
  } finally {
    lock.releaseLock();
  }
}

function listTodoItems() {
  const context = getSimpleTableContext("To Do", TODO_ITEM_COLUMNS, "ID");

  return readSimpleTableDisplayRows(context)
    .map((row) => ({
      ID: String(row.ID || "").trim(),
      Order: String(row.Order || "").trim(),
      Name: String(row.Name || "").trim(),
      "Low Hour": String(row["Low Hour"] ?? "").trim(),
      "High Hour": String(row["High Hour"] ?? "").trim(),
      "Parent ID": String(row["Parent ID"] || "").trim(),
      Started: isTrueValue(row.Started),
      Archived: isTrueValue(row.Archived),
      "Platinum Cleanup": isTrueValue(row["Platinum Cleanup"]),
      Completed: isTrueValue(row.Completed),
      IsDeleted: isTrueValue(row.IsDeleted),
      Unpurchased: isTrueValue(row.Unpurchased),
      "Image URL": String(row["Image URL"] || "").trim(),
    }))
    .filter((row) => row.ID && row.Name)
    .sort(compareTodoRows);
}

function getTodoRows(context) {
  return readSimpleTableRows(context)
    .map((row) => normalizeTodoItem(row))
    .filter((row) => row.ID && row.Name)
    .sort(compareTodoRows);
}

function writeTodoRows(context, rows) {
  const lastRow = context.sheet.getLastRow();
  const writeRows = rows.map((row) => {
    const values = Array(context.rowWidth).fill("");
    TODO_ITEM_COLUMNS.forEach((column) => {
      values[context.columns[column] - 1] = row[column] === undefined ? "" : row[column];
    });
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

function normalizeTodoItem(item) {
  return {
    ID: String(item.ID || item.Id || item.id || "").trim(),
    Order: clampTodoOrder(item.Order || item.order, Number.MAX_SAFE_INTEGER),
    Name: String(item.Name || item.name || "").trim(),
    "Low Hour": String(item["Low Hour"] ?? item.lowHour ?? "").trim(),
    "High Hour": String(item["High Hour"] ?? item.highHour ?? "").trim(),
    "Parent ID": String(item["Parent ID"] || item.parentId || "").trim(),
    Started: normalizeBool(item.Started || item.started),
    Archived: normalizeBool(item.Archived || item.archived),
    "Platinum Cleanup": normalizeBool(item["Platinum Cleanup"] || item.platinumCleanup),
    Completed: normalizeBool(item.Completed || item.completed),
    IsDeleted: normalizeBool(item.IsDeleted || item.isDeleted),
    Unpurchased: normalizeBool(item.Unpurchased || item.unpurchased),
    "Image URL": String(item["Image URL"] || item.imageUrl || "").trim(),
  };
}

function normalizeTodoOrder(rows, options) {
  const normalizedRows = rows.map((row) => normalizeTodoItem(row));
  let orderableRows = getTodoDefaultOrderRows(normalizedRows);

  if (options && options.orderedRows) {
    orderableRows = options.orderedRows;
  } else if (options && options.movedId) {
    const movedId = String(options.movedId || "").trim();
    const movedRow = normalizedRows.find((row) => row.ID === movedId);
    orderableRows = orderableRows.filter((row) => row.ID !== movedId);

    if (movedRow && isTodoDefaultOrderRow(movedRow, normalizedRows)) {
      const targetIndex = clampTodoOrder(options.requestedOrder, orderableRows.length + 1) - 1;
      orderableRows.splice(targetIndex, 0, movedRow);
    }
  }

  const orderById = {};
  orderableRows.forEach((row, index) => {
    orderById[row.ID] = String(index + 1);
  });

  return normalizedRows.map((row) => ({
    ...row,
    Order: orderById[row.ID] || row.Order || "",
  })).sort(compareTodoRows);
}

function getTodoDefaultOrderRows(rows) {
  return rows
    .filter((row) => isTodoDefaultOrderRow(row, rows))
    .sort(compareTodoRows);
}

function isTodoDefaultOrderRow(row, rows) {
  if (!row || row.Archived === "TRUE" || row.IsDeleted === "TRUE" || (row.Completed === "TRUE" && row["Platinum Cleanup"] !== "TRUE")) {
    return false;
  }

  const parent = String(row["Parent ID"] || "").trim()
    ? rows.find((candidate) => candidate.ID === String(row["Parent ID"] || "").trim())
    : null;

  return !(parent && parent.Completed !== "TRUE" && parent.Archived !== "TRUE" && parent.IsDeleted !== "TRUE");
}

function clampTodoOrder(value, maxOrder) {
  const order = Number(value);

  if (!Number.isInteger(order) || order <= 0) {
    return Math.max(1, maxOrder);
  }

  return Math.min(order, Math.max(1, maxOrder));
}

function compareTodoRows(first, second) {
  if (Number(first.Order) !== Number(second.Order)) {
    return Number(first.Order) - Number(second.Order);
  }

  return String(first.ID || "").localeCompare(String(second.ID || ""), undefined, { numeric: true });
}

function saveWantItem(item) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const context = getSimpleTableContext("Want", WANT_ITEM_COLUMNS, "ID");
    const rows = getWantRows(context);
    const rowValues = normalizeWantItem(item);
    rowValues.ID = rowValues.ID || getNextNumericIdFromRows(rows, "ID");
    if (!rowValues.ID) throw new Error("ID is required.");
    if (!rowValues.Name) throw new Error("Name is required.");
    const nextRows = rows.filter((row) => row.ID !== rowValues.ID).concat([rowValues]);
    writeWantRows(context, normalizeWantOrder(nextRows, rowValues.ID, rowValues.Order));
    return { ok: true, id: rowValues.ID, status: rows.some((row) => row.ID === rowValues.ID) ? "updated" : "appended" };
  } finally { lock.releaseLock(); }
}

function saveWantOrder(items) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const context = getSimpleTableContext("Want", WANT_ITEM_COLUMNS, "ID");
    const existingRows = getWantRows(context);
    const byId = {};
    existingRows.forEach((row) => { byId[row.ID] = row; });
    const ordered = items.map((item) => byId[String(item.ID || item.id || "").trim()]).filter((row) => row && isWantOrderable(row));
    const used = {};
    ordered.forEach((row) => { used[row.ID] = true; });
    const remaining = existingRows.filter((row) => isWantOrderable(row) && !used[row.ID]).sort(compareWantRows);
    const orderById = {};
    ordered.concat(remaining).forEach((row, index) => { orderById[row.ID] = String(index + 1); });
    const nextRows = existingRows.map((row) => ({ ...row, Order: orderById[row.ID] || row.Order })).sort(compareWantRows);
    writeWantRows(context, nextRows);
    return { ok: true, count: nextRows.length, status: "updated" };
  } finally { lock.releaseLock(); }
}

function listWantItems() {
  const context = getSimpleTableContext("Want", WANT_ITEM_COLUMNS, "ID");
  return readSimpleTableDisplayRows(context).map((row) => ({
    ID: String(row.ID || "").trim(), Order: String(row.Order || "").trim(), Name: String(row.Name || "").trim(),
    Price: String(row.Price ?? "").trim(), Archived: isTrueValue(row.Archived), Completed: isTrueValue(row.Completed),
    IsDeleted: isTrueValue(row.IsDeleted), "Image URL": String(row["Image URL"] || "").trim(),
  })).filter((row) => row.ID && row.Name).sort(compareWantRows);
}

function getWantRows(context) {
  return readSimpleTableRows(context).map(normalizeWantItem).filter((row) => row.ID && row.Name).sort(compareWantRows);
}

function normalizeWantItem(item) {
  return {
    ID: String(item.ID || item.Id || item.id || "").trim(),
    Order: clampTodoOrder(item.Order || item.order, Number.MAX_SAFE_INTEGER),
    Name: String(item.Name || item.name || "").trim(),
    Price: String(item.Price ?? item.price ?? "").trim(),
    Archived: normalizeBool(item.Archived || item.archived),
    Completed: normalizeBool(item.Completed || item.completed),
    IsDeleted: normalizeBool(item.IsDeleted || item.isDeleted),
    "Image URL": String(item["Image URL"] || item.imageUrl || "").trim(),
  };
}

function normalizeWantOrder(rows, movedId, requestedOrder) {
  const normalized = rows.map(normalizeWantItem);
  const moved = normalized.find((row) => row.ID === String(movedId));
  const ordered = normalized.filter((row) => isWantOrderable(row) && row.ID !== String(movedId)).sort(compareWantRows);
  if (moved && isWantOrderable(moved)) ordered.splice(clampTodoOrder(requestedOrder, ordered.length + 1) - 1, 0, moved);
  const orderById = {};
  ordered.forEach((row, index) => { orderById[row.ID] = String(index + 1); });
  return normalized.map((row) => ({ ...row, Order: orderById[row.ID] || row.Order || "" })).sort(compareWantRows);
}

function isWantOrderable(row) {
  return row && row.Archived !== "TRUE" && row.Completed !== "TRUE" && row.IsDeleted !== "TRUE";
}

function compareWantRows(first, second) {
  return Number(first.Order) - Number(second.Order) || String(first.ID || "").localeCompare(String(second.ID || ""), undefined, { numeric: true });
}

function writeWantRows(context, rows) {
  const lastRow = context.sheet.getLastRow();
  const values = rows.map((row) => {
    const output = Array(context.rowWidth).fill("");
    WANT_ITEM_COLUMNS.forEach((column) => { output[context.columns[column] - 1] = row[column] === undefined ? "" : row[column]; });
    return output;
  });
  if (values.length) context.sheet.getRange(context.headerRow + 1, 1, values.length, context.rowWidth).setValues(values);
  const extra = lastRow - context.headerRow - values.length;
  if (extra > 0) context.sheet.getRange(context.headerRow + 1 + values.length, 1, extra, context.rowWidth).clearContent();
}

function moveWantToTodo(itemId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const wantContext = getSimpleTableContext("Want", WANT_ITEM_COLUMNS, "ID");
    const wantRows = getWantRows(wantContext);
    const wantItem = wantRows.find((row) => row.ID === String(itemId || "").trim());
    if (!wantItem) throw new Error("Want item was not found.");
    if (wantItem.Completed === "TRUE") throw new Error("Want item has already been moved or completed.");

    const todoContext = getSimpleTableContext("To Do", TODO_ITEM_COLUMNS, "ID");
    const todoRows = getTodoRows(todoContext);
    const todoId = getNextNumericIdFromRows(todoRows, "ID");
    const todoItem = normalizeTodoItem({
      ID: todoId, Order: getTodoDefaultOrderRows(todoRows).length + 1, Name: wantItem.Name,
      Archived: "FALSE", Completed: "FALSE", IsDeleted: "FALSE", "Image URL": wantItem["Image URL"],
    });
    writeTodoRows(todoContext, normalizeTodoOrder(todoRows.concat([todoItem]), { movedId: todoId, requestedOrder: todoItem.Order }));
    writeWantRows(wantContext, normalizeWantOrder(wantRows.map((row) => row.ID === wantItem.ID ? { ...row, Completed: "TRUE" } : row), wantItem.ID, wantItem.Order));
    return { ok: true, status: "moved", todoId, wantId: wantItem.ID };
  } finally { lock.releaseLock(); }
}

function getNextNumericId(rowsById) {
  const maxId = Object.keys(rowsById || {}).reduce((maxValue, id) => {
    const numericId = Number(String(id || "").trim());
    return Number.isInteger(numericId) && numericId > maxValue ? numericId : maxValue;
  }, 0);

  return String(maxId + 1);
}

function saveRankingItem(ranking, sheetName, item, seed, normalization) {
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
    const seedResult = seed
      ? saveRankingSeedWithoutLock({
        ...seed,
        "Item ID": rowValues.ID,
        "Ranking Type": getRankingTypeForKey(ranking),
        "Seed Rank": rank,
      })
      : null;
    const normalizeResult = normalization
      ? normalizeRankingWithoutLock({
        ...normalization,
        rankingType: getRankingTypeForKey(ranking),
      })
      : null;

    return {
      ok: true,
      id: rowValues.ID,
      normalize: normalizeResult,
      seed: seedResult,
      status: rows.some((row) => row.ID === rowValues.ID) ? "updated" : "appended",
    };
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

function getRankingTypeForKey(ranking) {
  const normalizedRanking = String(ranking || "").trim();
  return RANKING_TYPES[normalizedRanking] || normalizedRanking;
}

function listRankingChoices(managerId) {
  const normalizedManagerId = String(managerId || "").trim();
  const context = getSimpleTableContext("Ranking Choices", RANKING_CHOICE_COLUMNS, "ID");
  return readSimpleTableRows(context)
    .map((row) => ({
      "Created At": row["Created At"],
      ID: row.ID,
      "Item A ID": row["Item A ID"],
      "Item B ID": row["Item B ID"],
      "Loser ID": row["Loser ID"],
      "Manager ID": row["Manager ID"],
      "Ranking Type": row["Ranking Type"],
      "Winner ID": row["Winner ID"],
    }))
    .filter((row) =>
      row["Ranking Type"] &&
      row["Winner ID"] &&
      row["Loser ID"] &&
      (!normalizedManagerId || String(row["Manager ID"] || "").trim() === normalizedManagerId)
    );
}

function listChoiceRows(sheetName, managerId) {
  const normalizedManagerId = String(managerId || "").trim();
  const context = getOrCreateSimpleTableContext(sheetName, RANKING_CHOICE_COLUMNS, "ID");
  return readSimpleTableRows(context)
    .map(normalizeRankingChoice)
    .filter((row) => row["Winner ID"] && row["Loser ID"] &&
      (!normalizedManagerId || String(row["Manager ID"] || "").trim() === normalizedManagerId));
}

function listTodoChoices() {
  const context = getSimpleTableContext(TODO_CHOICE_SHEET, TODO_CHOICE_COLUMNS, "ID");
  return readSimpleTableRows(context).map((row) => ({
    "Created At": row["Created At"],
    ID: row.ID,
    "Item A ID": row["Item A ID"],
    "Item B ID": row["Item B ID"],
    "Loser ID": row["Loser ID"],
    "Manager ID": "todo",
    "Ranking Type": "todo",
    "Winner ID": row["Winner ID"],
  })).filter((row) => row["Winner ID"] && row["Loser ID"]);
}

function listRankingElo(managerId) {
  const normalizedManagerId = String(managerId || "").trim();
  const context = getSimpleTableContext("Ranking Elo", RANKING_ELO_COLUMNS, "Ranking Type");
  return readSimpleTableRows(context)
    .map((row) => ({
      ID: row.ID,
      "Item ID": row["Item ID"],
      "Last Choice ID": row["Last Choice ID"],
      Losses: row.Losses,
      "Manager ID": row["Manager ID"],
      "Ranking Type": row["Ranking Type"],
      Rating: row.Rating,
      "Updated At": row["Updated At"],
      Wins: row.Wins,
    }))
    .filter((row) =>
      row["Ranking Type"] &&
      row["Item ID"] &&
      row["Manager ID"] &&
      (!normalizedManagerId || String(row["Manager ID"]).trim() === normalizedManagerId)
    );
}

function listEloRows(sheetName, managerId) {
  const normalizedManagerId = String(managerId || "").trim();
  const context = getOrCreateSimpleTableContext(sheetName, RANKING_ELO_COLUMNS, "ID");
  return readSimpleTableRows(context)
    .map((row) => ({
      ID: row.ID,
      "Item ID": row["Item ID"],
      "Last Choice ID": row["Last Choice ID"],
      Losses: row.Losses,
      "Manager ID": row["Manager ID"],
      "Ranking Type": row["Ranking Type"] || "todo",
      Rating: row.Rating,
      "Updated At": row["Updated At"],
      Wins: row.Wins,
    }))
    .filter((row) => row["Item ID"] && row["Manager ID"] &&
      (!normalizedManagerId || String(row["Manager ID"]).trim() === normalizedManagerId));
}

function listTodoElo() {
  const context = getSimpleTableContext(TODO_ELO_SHEET, TODO_ELO_COLUMNS, "ID");
  return readSimpleTableRows(context).map((row) => ({
    ID: row.ID,
    "Item ID": row["Item ID"],
    "Last Choice ID": row["Last Choice ID"],
    Losses: row.Losses,
    "Manager ID": "todo",
    "Ranking Type": "todo",
    Rating: row.Rating,
    "Updated At": row["Updated At"],
    Wins: row.Wins,
  })).filter((row) => row["Item ID"]);
}

function listTodoSeeds() {
  const context = getSimpleTableContext(TODO_SEED_SHEET, TODO_SEED_COLUMNS, "ID");
  return readSimpleTableRows(context).map((row) => ({
    "Item ID": row["Item ID"],
    "Ranking Type": "todo",
    Reason: row.Reason,
    "Seed Rank": row["Seed Rank"],
    "Seed Rating": row["Seed Rating"],
    "Seeded At": row["Seeded At"],
  })).filter((row) => row["Item ID"]);
}

function listTodoSnapshots() {
  const context = getSimpleTableContext(TODO_SNAPSHOT_SHEET, TODO_SNAPSHOT_COLUMNS, "Snapshot ID");
  return readSimpleTableRows(context).map((row) => ({
    "Created At": row["Created At"],
    Label: row.Label,
    "Manager ID": "todo",
    "Ranking Type": "todo",
    Reason: row.Reason,
    "Snapshot ID": row["Snapshot ID"],
    Source: row.Source,
  })).filter((row) => row["Snapshot ID"]);
}

function listTodoSnapshotItems() {
  const context = getSimpleTableContext(TODO_SNAPSHOT_ITEM_SHEET, TODO_SNAPSHOT_ITEM_COLUMNS, "Snapshot ID");
  return readSimpleTableRows(context).map((row) => ({
    Games: row.Games,
    "Item ID": row["Item ID"],
    "Item Name": row["Item Name"],
    Losses: row.Losses,
    Rank: row.Rank,
    Rating: row.Rating,
    "Snapshot ID": row["Snapshot ID"],
    Wins: row.Wins,
  })).filter((row) => row["Snapshot ID"] && row["Item ID"]);
}

function listWantChoices() {
  const context = getSimpleTableContext(WANT_CHOICE_SHEET, TODO_CHOICE_COLUMNS, "ID");
  return readSimpleTableRows(context).map((row) => ({
    "Created At": row["Created At"], ID: row.ID, "Item A ID": row["Item A ID"], "Item B ID": row["Item B ID"],
    "Loser ID": row["Loser ID"], "Manager ID": "want", "Ranking Type": "want", "Winner ID": row["Winner ID"],
  })).filter((row) => row["Winner ID"] && row["Loser ID"]);
}

function listWantElo() {
  const context = getSimpleTableContext(WANT_ELO_SHEET, TODO_ELO_COLUMNS, "ID");
  return readSimpleTableRows(context).map((row) => ({
    ID: row.ID, "Item ID": row["Item ID"], "Last Choice ID": row["Last Choice ID"], Losses: row.Losses,
    "Manager ID": "want", "Ranking Type": "want", Rating: row.Rating, "Updated At": row["Updated At"], Wins: row.Wins,
  })).filter((row) => row["Item ID"]);
}

function listWantSeeds() {
  const context = getSimpleTableContext(WANT_SEED_SHEET, TODO_SEED_COLUMNS, "ID");
  return readSimpleTableRows(context).map((row) => ({
    "Item ID": row["Item ID"], "Ranking Type": "want", Reason: row.Reason, "Seed Rank": row["Seed Rank"],
    "Seed Rating": row["Seed Rating"], "Seeded At": row["Seeded At"],
  })).filter((row) => row["Item ID"]);
}

function listWantSnapshots() {
  const context = getSimpleTableContext(WANT_SNAPSHOT_SHEET, TODO_SNAPSHOT_COLUMNS, "Snapshot ID");
  return readSimpleTableRows(context).map((row) => ({
    "Created At": row["Created At"], Label: row.Label, "Manager ID": "want", "Ranking Type": "want",
    Reason: row.Reason, "Snapshot ID": row["Snapshot ID"], Source: row.Source,
  })).filter((row) => row["Snapshot ID"]);
}

function listWantSnapshotItems() {
  const context = getSimpleTableContext(WANT_SNAPSHOT_ITEM_SHEET, TODO_SNAPSHOT_ITEM_COLUMNS, "Snapshot ID");
  return readSimpleTableRows(context).map((row) => ({
    Games: row.Games, "Item ID": row["Item ID"], "Item Name": row["Item Name"], Losses: row.Losses,
    Rank: row.Rank, Rating: row.Rating, "Snapshot ID": row["Snapshot ID"], Wins: row.Wins,
  })).filter((row) => row["Snapshot ID"] && row["Item ID"]);
}

function repairRankingEloDuplicateManagers(options) {
  const fromManagerId = String(options && options.fromManagerId || "6").trim();
  const toManagerId = String(options && options.toManagerId || "8").trim();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const context = getSimpleTableContext("Ranking Elo", RANKING_ELO_COLUMNS, "Ranking Type");
    const groups = {};

    readSimpleTableRows(context)
      .filter((row) => row["Ranking Type"] && row["Item ID"])
      .forEach((row) => {
        const key = `${String(row["Ranking Type"]).trim().toLowerCase()}::${String(row["Item ID"]).trim()}`;
        groups[key] = groups[key] || [];
        groups[key].push(row);
      });

    const updatedRows = [];

    Object.values(groups).forEach((rows) => {
      const fromRows = rows
        .filter((row) => String(row["Manager ID"] || "").trim() === fromManagerId)
        .sort((first, second) => Number(first.rowNumber || 0) - Number(second.rowNumber || 0));

      fromRows.slice(1).forEach((row) => {
        context.sheet.getRange(row.rowNumber, context.columns["Manager ID"]).setValue(toManagerId);
        updatedRows.push({
          ID: row.ID,
          "Item ID": row["Item ID"],
          "Ranking Type": row["Ranking Type"],
          rowNumber: row.rowNumber,
        });
      });
    });

    return {
      fromManagerId,
      ok: true,
      status: "updated",
      toManagerId,
      updatedCount: updatedRows.length,
      updatedRows,
    };
  } finally {
    lock.releaseLock();
  }
}

function listRankingSeeds() {
  const context = getSimpleTableContext("Ranking Seeds", RANKING_SEED_COLUMNS, "Ranking Type");
  return readSimpleTableRows(context)
    .map((row) => ({
      "Item ID": row["Item ID"],
      Reason: row.Reason,
      "Ranking Type": row["Ranking Type"],
      "Seed Rank": row["Seed Rank"],
      "Seed Rating": row["Seed Rating"],
      "Seeded At": row["Seeded At"],
    }))
    .filter((row) => row["Ranking Type"] && row["Item ID"]);
}

function listRankingExclusions() {
  const context = getSimpleTableContext("Ranking Exclusions", RANKING_EXCLUSION_COLUMNS, "ID");
  return readSimpleTableRows(context)
    .map((row) => ({
      Excluded: row.Excluded,
      ID: row.ID,
      "Item ID": row["Item ID"],
      "Manager ID": row["Manager ID"],
      "Ranking Type": row["Ranking Type"],
      "Updated At": row["Updated At"],
    }))
    .filter((row) => row["Ranking Type"] && row["Item ID"] && row["Manager ID"]);
}

function listRankingSnapshots() {
  const context = getSimpleTableContext("Ranking Snapshots", RANKING_SNAPSHOT_COLUMNS, "Snapshot ID");
  return readSimpleTableRows(context)
    .map((row) => ({
      "Created At": row["Created At"],
      Label: row.Label,
      "Manager ID": row["Manager ID"],
      Ranking: row["Ranking Type"],
      "Ranking Type": row["Ranking Type"],
      Reason: row.Reason,
      "Snapshot ID": row["Snapshot ID"],
      Source: row.Source,
    }))
    .filter((row) => row["Snapshot ID"] && row["Ranking Type"]);
}

function listRankingSnapshotItems() {
  const context = getSimpleTableContext("Ranking Snapshot Items", RANKING_SNAPSHOT_ITEM_COLUMNS, "Snapshot ID");
  return readSimpleTableRows(context)
    .map((row) => ({
      Games: row.Games,
      "Item ID": row["Item ID"],
      "Item Name": row["Item Name"],
      Losses: row.Losses,
      Rank: row.Rank,
      Rating: row.Rating,
      "Snapshot ID": row["Snapshot ID"],
      Wins: row.Wins,
    }))
    .filter((row) => row["Snapshot ID"] && row["Item ID"]);
}

function saveRankingExclusion(exclusion) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const context = getSimpleTableContext("Ranking Exclusions", RANKING_EXCLUSION_COLUMNS, "ID");
    const rows = readSimpleTableRows(context);
    const rowValues = normalizeRankingExclusion(exclusion);
    const existingRow = rows.find((row) =>
      String(row["Ranking Type"] || "").trim().toLowerCase() === String(rowValues["Ranking Type"] || "").trim().toLowerCase() &&
      String(row["Item ID"] || "").trim() === String(rowValues["Item ID"] || "").trim() &&
      String(row["Manager ID"] || "").trim() === String(rowValues["Manager ID"] || "").trim()
    );

    if (!rowValues["Ranking Type"] || !rowValues["Item ID"] || !rowValues["Manager ID"]) {
      throw new Error("Ranking Type, Item ID, and Manager ID are required for Ranking Exclusions.");
    }

    if (existingRow && existingRow.rowNumber) {
      rowValues.ID = String(existingRow.ID || "").trim() || rowValues.ID || getNextNumericIdFromRows(rows, "ID");
      writeSimpleTableCells(context, existingRow.rowNumber, rowValues, RANKING_EXCLUSION_COLUMNS);
      return { ok: true, exclusion: rowValues, status: "updated" };
    }

    rowValues.ID = rowValues.ID || getNextNumericIdFromRows(rows, "ID");
    appendSimpleTableRow(context, rowValues, RANKING_EXCLUSION_COLUMNS);
    return { ok: true, exclusion: rowValues, status: "appended" };
  } finally {
    lock.releaseLock();
  }
}

function normalizeRankingExclusion(exclusion) {
  return {
    Excluded: normalizeBool(exclusion.Excluded || exclusion.excluded),
    ID: String(exclusion.ID || exclusion.Id || exclusion.id || "").trim(),
    "Item ID": String(exclusion["Item ID"] || exclusion.itemId || "").trim(),
    "Manager ID": String(exclusion["Manager ID"] || exclusion.managerId || "").trim(),
    "Ranking Type": String(exclusion["Ranking Type"] || exclusion.rankingType || exclusion.ranking || "").trim(),
    "Updated At": String(exclusion["Updated At"] || exclusion.updatedAt || new Date().toISOString()).trim(),
  };
}

function saveRankingSeedWithoutLock(seed) {
  const context = getSimpleTableContext("Ranking Seeds", RANKING_SEED_COLUMNS, "Ranking Type");
  const rows = readSimpleTableRows(context);
  const rowValues = normalizeRankingSeed(seed);

  if (!rowValues["Ranking Type"] || !rowValues["Item ID"]) {
    throw new Error("Ranking Type and Item ID are required for Ranking Seeds.");
  }

  const existingRow = rows.find((row) =>
    String(row["Ranking Type"] || "").trim().toLowerCase() === String(rowValues["Ranking Type"] || "").trim().toLowerCase() &&
    String(row["Item ID"] || "").trim() === String(rowValues["Item ID"] || "").trim()
  );

  if (existingRow && existingRow.rowNumber) {
    writeSimpleTableCells(context, existingRow.rowNumber, rowValues, RANKING_SEED_COLUMNS);
    ensureRankingEloSeedRow(rowValues);
    return { ok: true, itemId: rowValues["Item ID"], status: "updated" };
  }

  appendSimpleTableRow(context, rowValues, RANKING_SEED_COLUMNS);
  ensureRankingEloSeedRow(rowValues);
  return { ok: true, itemId: rowValues["Item ID"], status: "appended" };
}

function normalizeRankingSeed(seed) {
  const seedRating = Number(seed["Seed Rating"] || seed.seedRating || RANKING_BASE_RATING);
  const seedRank = Number(seed["Seed Rank"] || seed.seedRank || "");

  return {
    "Item ID": String(seed["Item ID"] || seed.itemId || "").trim(),
    "Ranking Type": String(seed["Ranking Type"] || seed.rankingType || seed.ranking || "").trim(),
    Reason: String(seed.Reason || seed.reason || "Initial rating from manual placement").trim(),
    "Seed Rank": Number.isFinite(seedRank) && seedRank > 0 ? seedRank : "",
    "Seed Rating": Number.isFinite(seedRating) ? Math.round(seedRating) : RANKING_BASE_RATING,
    "Seeded At": String(seed["Seeded At"] || seed.seededAt || new Date().toISOString()).trim(),
  };
}

function ensureRankingEloSeedRow(seed) {
  return;
}

function saveRankingChoice(choice) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const choiceContext = getSimpleTableContext("Ranking Choices", RANKING_CHOICE_COLUMNS, "ID");
    const rowValues = normalizeRankingChoice(choice);

    if (!rowValues["Ranking Type"] || !rowValues["Winner ID"] || !rowValues["Loser ID"] || !rowValues["Manager ID"]) {
      throw new Error("Ranking Type, Winner ID, Loser ID, and Manager ID are required.");
    }

    if (!rowValues.ID) {
      rowValues.ID = getNextNumericIdFromRows(readSimpleTableRows(choiceContext), "ID");
    }

    appendSimpleTableRow(choiceContext, rowValues, RANKING_CHOICE_COLUMNS);
    const eloRows = updateRankingEloRows(rowValues);

    return {
      choice: rowValues,
      elo: eloRows,
      ok: true,
      status: "appended",
    };
  } finally {
    lock.releaseLock();
  }
}

function saveChoiceToTables(choice, choiceSheetName, eloSheetName) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const choiceContext = getOrCreateSimpleTableContext(choiceSheetName, RANKING_CHOICE_COLUMNS, "ID");
    const rowValues = normalizeRankingChoice({ ...choice, rankingType: "todo", "Ranking Type": "todo" });
    if (!rowValues["Winner ID"] || !rowValues["Loser ID"] || !rowValues["Manager ID"]) {
      throw new Error("Winner ID, Loser ID, and Manager ID are required.");
    }
    if (!rowValues.ID) rowValues.ID = getNextNumericIdFromRows(readSimpleTableRows(choiceContext), "ID");
    appendSimpleTableRow(choiceContext, rowValues, RANKING_CHOICE_COLUMNS);
    const eloRows = updateRankingEloRows(rowValues, eloSheetName);
    return { choice: rowValues, elo: eloRows, ok: true, status: "appended" };
  } finally {
    lock.releaseLock();
  }
}

function saveTodoChoice(choice) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const choiceContext = getSimpleTableContext(TODO_CHOICE_SHEET, TODO_CHOICE_COLUMNS, "ID");
    const rows = readSimpleTableRows(choiceContext);
    const rowValues = {
      ID: String(choice.ID || choice.id || "").trim() || getNextNumericIdFromRows(rows, "ID"),
      "Item A ID": String(choice["Item A ID"] || choice.itemAId || "").trim(),
      "Item B ID": String(choice["Item B ID"] || choice.itemBId || "").trim(),
      "Winner ID": String(choice["Winner ID"] || choice.winnerId || "").trim(),
      "Loser ID": String(choice["Loser ID"] || choice.loserId || "").trim(),
      "Created At": String(choice["Created At"] || choice.createdAt || new Date().toISOString()).trim(),
    };
    if (!rowValues["Winner ID"] || !rowValues["Loser ID"]) throw new Error("Winner ID and Loser ID are required.");
    appendSimpleTableRow(choiceContext, rowValues, TODO_CHOICE_COLUMNS);
    return { choice: rowValues, elo: updateTodoEloRows(rowValues), ok: true, status: "appended" };
  } finally {
    lock.releaseLock();
  }
}

function saveWantChoice(choice) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const context = getSimpleTableContext(WANT_CHOICE_SHEET, TODO_CHOICE_COLUMNS, "ID");
    const rows = readSimpleTableRows(context);
    const rowValues = {
      ID: String(choice.ID || choice.id || "").trim() || getNextNumericIdFromRows(rows, "ID"),
      "Item A ID": String(choice["Item A ID"] || choice.itemAId || "").trim(),
      "Item B ID": String(choice["Item B ID"] || choice.itemBId || "").trim(),
      "Winner ID": String(choice["Winner ID"] || choice.winnerId || "").trim(),
      "Loser ID": String(choice["Loser ID"] || choice.loserId || "").trim(),
      "Created At": String(choice["Created At"] || choice.createdAt || new Date().toISOString()).trim(),
    };
    if (!rowValues["Winner ID"] || !rowValues["Loser ID"]) throw new Error("Winner ID and Loser ID are required.");
    appendSimpleTableRow(context, rowValues, TODO_CHOICE_COLUMNS);
    return { choice: rowValues, elo: updateWantEloRows(rowValues), ok: true, status: "appended" };
  } finally { lock.releaseLock(); }
}

function updateWantEloRows(choice) {
  const context = getSimpleTableContext(WANT_ELO_SHEET, TODO_ELO_COLUMNS, "ID");
  const rows = readSimpleTableRows(context);
  const winner = getWantEloRow(rows, choice["Winner ID"]);
  const loser = getWantEloRow(rows, choice["Loser ID"]);
  const updatedAt = new Date().toISOString();
  const winnerNext = { ...winner, "Last Choice ID": choice.ID,
    Rating: Math.round(winner.Rating + getRankingKFactor(winner) * (1 - getRankingExpectedScore(winner.Rating, loser.Rating))),
    "Updated At": updatedAt, Wins: winner.Wins + 1 };
  const loserNext = { ...loser, "Last Choice ID": choice.ID, Losses: loser.Losses + 1,
    Rating: Math.round(loser.Rating + getRankingKFactor(loser) * (0 - getRankingExpectedScore(loser.Rating, winner.Rating))),
    "Updated At": updatedAt };
  upsertWantEloRow(context, winnerNext);
  upsertWantEloRow(context, loserNext);
  return [winnerNext, loserNext];
}

function getWantEloRow(rows, itemId) {
  const row = rows.find((entry) => String(entry["Item ID"] || "").trim() === String(itemId || "").trim());
  const seed = row ? null : ensureWantSeed(itemId);
  const wins = Number(row && row.Wins || 0);
  const losses = Number(row && row.Losses || 0);
  return { Comparisons: wins + losses, ID: String(row && row.ID || "").trim(), "Item ID": String(itemId || "").trim(),
    "Last Choice ID": String(row && row["Last Choice ID"] || "").trim(), Losses: losses,
    Rating: Number(row && row.Rating || seed && seed["Seed Rating"] || RANKING_BASE_RATING), rowNumber: row && row.rowNumber,
    "Updated At": String(row && row["Updated At"] || "").trim(), Wins: wins };
}

function ensureWantSeed(itemId) {
  const context = getSimpleTableContext(WANT_SEED_SHEET, TODO_SEED_COLUMNS, "ID");
  const rows = readSimpleTableRows(context);
  const existing = rows.find((row) => String(row["Item ID"] || "").trim() === String(itemId || "").trim());
  if (existing) return existing;
  const wantRows = listWantItems().filter((row) => !row.Archived && !row.Completed && !row.IsDeleted);
  const index = wantRows.findIndex((row) => String(row.ID) === String(itemId));
  const seedRank = index >= 0 ? index + 1 : wantRows.length + 1;
  const seed = { ID: getNextNumericIdFromRows(rows, "ID"), "Item ID": String(itemId || "").trim(),
    Reason: "Initial rating from manual Want order", "Seed Rank": seedRank,
    "Seed Rating": calculateNormalizedRatingForTable(seedRank, Math.max(wantRows.length, 1)), "Seeded At": new Date().toISOString() };
  appendSimpleTableRow(context, seed, TODO_SEED_COLUMNS);
  return seed;
}

function upsertWantEloRow(context, rowValues) {
  if (rowValues.rowNumber) return writeSimpleTableCells(context, rowValues.rowNumber, rowValues, TODO_ELO_COLUMNS);
  const rows = readSimpleTableRows(context);
  rowValues.ID = rowValues.ID || getNextNumericIdFromRows(rows, "ID");
  appendSimpleTableRow(context, rowValues, TODO_ELO_COLUMNS);
}

function updateTodoEloRows(choice) {
  const context = getSimpleTableContext(TODO_ELO_SHEET, TODO_ELO_COLUMNS, "ID");
  const rows = readSimpleTableRows(context);
  const winner = getTodoEloRow(rows, choice["Winner ID"]);
  const loser = getTodoEloRow(rows, choice["Loser ID"]);
  const updatedAt = new Date().toISOString();
  const winnerNext = {
    ...winner,
    "Last Choice ID": choice.ID,
    Rating: Math.round(winner.Rating + getRankingKFactor(winner) * (1 - getRankingExpectedScore(winner.Rating, loser.Rating))),
    "Updated At": updatedAt,
    Wins: winner.Wins + 1,
  };
  const loserNext = {
    ...loser,
    "Last Choice ID": choice.ID,
    Losses: loser.Losses + 1,
    Rating: Math.round(loser.Rating + getRankingKFactor(loser) * (0 - getRankingExpectedScore(loser.Rating, winner.Rating))),
    "Updated At": updatedAt,
  };
  upsertTodoEloRow(context, winnerNext);
  upsertTodoEloRow(context, loserNext);
  return [winnerNext, loserNext];
}

function getTodoEloRow(rows, itemId) {
  const row = rows.find((entry) => String(entry["Item ID"] || "").trim() === String(itemId || "").trim());
  const seed = row ? null : ensureTodoSeed(itemId);
  const wins = Number(row && row.Wins || 0);
  const losses = Number(row && row.Losses || 0);
  return {
    Comparisons: wins + losses,
    ID: String(row && row.ID || "").trim(),
    "Item ID": String(itemId || "").trim(),
    "Last Choice ID": String(row && row["Last Choice ID"] || "").trim(),
    Losses: losses,
    Rating: Number(row && row.Rating || seed && seed["Seed Rating"] || RANKING_BASE_RATING),
    rowNumber: row && row.rowNumber,
    "Updated At": String(row && row["Updated At"] || "").trim(),
    Wins: wins,
  };
}

function ensureTodoSeed(itemId) {
  const context = getSimpleTableContext(TODO_SEED_SHEET, TODO_SEED_COLUMNS, "ID");
  const rows = readSimpleTableRows(context);
  const existing = rows.find((row) => String(row["Item ID"] || "").trim() === String(itemId || "").trim());
  if (existing) return existing;
  const todoRows = listTodoItems();
  const itemIndex = todoRows.findIndex((row) => String(row.ID || "").trim() === String(itemId || "").trim());
  const seedRank = itemIndex >= 0 ? itemIndex + 1 : todoRows.length + 1;
  const seed = {
    ID: getNextNumericIdFromRows(rows, "ID"),
    "Item ID": String(itemId || "").trim(),
    Reason: "Initial rating from manual To Do order",
    "Seed Rank": seedRank,
    "Seed Rating": calculateNormalizedRatingForTable(seedRank, Math.max(todoRows.length, 1)),
    "Seeded At": new Date().toISOString(),
  };
  appendSimpleTableRow(context, seed, TODO_SEED_COLUMNS);
  return seed;
}

function upsertTodoEloRow(context, rowValues) {
  if (rowValues.rowNumber) {
    writeSimpleTableCells(context, rowValues.rowNumber, rowValues, TODO_ELO_COLUMNS);
    return;
  }
  const rows = readSimpleTableRows(context);
  rowValues.ID = rowValues.ID || getNextNumericIdFromRows(rows, "ID");
  appendSimpleTableRow(context, rowValues, TODO_ELO_COLUMNS);
}

function normalizeTodo(normalization) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const items = Array.isArray(normalization.items) ? normalization.items : [];
    if (!items.length) throw new Error("At least one To Do item is required.");
    const createdAt = String(normalization.createdAt || new Date().toISOString()).trim();
    const snapshotContext = getSimpleTableContext(TODO_SNAPSHOT_SHEET, TODO_SNAPSHOT_COLUMNS, "Snapshot ID");
    const snapshotRows = readSimpleTableRows(snapshotContext);
    const snapshotId = String(normalization.snapshotId || getNextNumericIdFromRows(snapshotRows, "Snapshot ID"));
    appendSimpleTableRow(snapshotContext, {
      "Created At": createdAt,
      Label: String(normalization.label || formatSnapshotLabel(createdAt)).trim(),
      Reason: String(normalization.reason || "Normalized calculated To Do order").trim(),
      "Snapshot ID": snapshotId,
      Source: String(normalization.source || "calculated").trim(),
    }, TODO_SNAPSHOT_COLUMNS);
    const itemContext = getSimpleTableContext(TODO_SNAPSHOT_ITEM_SHEET, TODO_SNAPSHOT_ITEM_COLUMNS, "Snapshot ID");
    items.forEach((item, index) => appendSimpleTableRow(itemContext, {
      Games: Number(item.comparisons || item.Games || 0),
      "Item ID": String(item.itemId || item.id || "").trim(),
      "Item Name": String(item.itemName || item.name || "").trim(),
      Losses: Number(item.losses || 0), Rank: index + 1,
      Rating: Number(item.rating || RANKING_BASE_RATING),
      "Snapshot ID": snapshotId, Wins: Number(item.wins || 0),
    }, TODO_SNAPSHOT_ITEM_COLUMNS));
    const eloContext = getSimpleTableContext(TODO_ELO_SHEET, TODO_ELO_COLUMNS, "ID");
    deleteSimpleTableRows(eloContext, () => true);
    const eloRows = [];
    items.forEach((item, index) => {
      const row = { ID: String(index + 1), "Item ID": String(item.itemId || item.id || "").trim(), "Last Choice ID": "", Losses: 0,
        Rating: Number(item.normalizedRating || calculateNormalizedRatingForTable(index + 1, items.length)), "Updated At": createdAt, Wins: 0 };
      appendSimpleTableRow(eloContext, row, TODO_ELO_COLUMNS); eloRows.push(row);
    });
    return { elo: eloRows, ok: true, snapshotId, status: "normalized" };
  } finally { lock.releaseLock(); }
}

function normalizeWant(normalization) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const items = Array.isArray(normalization.items) ? normalization.items : [];
    if (!items.length) throw new Error("At least one Want item is required.");
    const createdAt = String(normalization.createdAt || new Date().toISOString()).trim();
    const snapshotContext = getSimpleTableContext(WANT_SNAPSHOT_SHEET, TODO_SNAPSHOT_COLUMNS, "Snapshot ID");
    const snapshotRows = readSimpleTableRows(snapshotContext);
    const snapshotId = String(normalization.snapshotId || getNextNumericIdFromRows(snapshotRows, "Snapshot ID"));
    appendSimpleTableRow(snapshotContext, { "Created At": createdAt, Label: String(normalization.label || formatSnapshotLabel(createdAt)).trim(),
      Reason: String(normalization.reason || "Normalized calculated Want order").trim(), "Snapshot ID": snapshotId,
      Source: String(normalization.source || "calculated").trim() }, TODO_SNAPSHOT_COLUMNS);
    const itemContext = getSimpleTableContext(WANT_SNAPSHOT_ITEM_SHEET, TODO_SNAPSHOT_ITEM_COLUMNS, "Snapshot ID");
    items.forEach((item, index) => appendSimpleTableRow(itemContext, {
      Games: Number(item.comparisons || item.Games || 0), "Item ID": String(item.itemId || item.id || "").trim(),
      "Item Name": String(item.itemName || item.name || "").trim(), Losses: Number(item.losses || 0), Rank: index + 1,
      Rating: Number(item.rating || RANKING_BASE_RATING), "Snapshot ID": snapshotId, Wins: Number(item.wins || 0),
    }, TODO_SNAPSHOT_ITEM_COLUMNS));
    const eloContext = getSimpleTableContext(WANT_ELO_SHEET, TODO_ELO_COLUMNS, "ID");
    deleteSimpleTableRows(eloContext, () => true);
    const eloRows = [];
    items.forEach((item, index) => {
      const row = { ID: String(index + 1), "Item ID": String(item.itemId || item.id || "").trim(), "Last Choice ID": "", Losses: 0,
        Rating: Number(item.normalizedRating || calculateNormalizedRatingForTable(index + 1, items.length)), "Updated At": createdAt, Wins: 0 };
      appendSimpleTableRow(eloContext, row, TODO_ELO_COLUMNS);
      eloRows.push(row);
    });
    return { elo: eloRows, ok: true, snapshotId, status: "normalized" };
  } finally { lock.releaseLock(); }
}

function calculateNormalizedRatingForTable(rank, total) {
  return Math.round(RANKING_BASE_RATING + ((((Number(total || 0) + 1) / 2) - Number(rank || 0)) * 8));
}

function normalizeRanking(normalization) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    return normalizeRankingWithoutLock(normalization);
  } finally {
    lock.releaseLock();
  }
}

function normalizeRankingWithoutLock(normalization) {
  const rankingType = String(normalization.rankingType || "").trim();
  const items = Array.isArray(normalization.items) ? normalization.items : [];
  const snapshotItems = Array.isArray(normalization.snapshotItems) ? normalization.snapshotItems : items;
  const createdAt = String(normalization.createdAt || new Date().toISOString()).trim();
  const managerId = String(normalization.managerId || "").trim();
  const reason = String(normalization.reason || "Normalized calculated rankings").trim();
  const source = String(normalization.source || "calculated").trim();

  if (!rankingType) {
    throw new Error("Ranking Type is required.");
  }

  if (!items.length) {
    throw new Error("At least one ranking item is required.");
  }

  const snapshotContext = getSimpleTableContext("Ranking Snapshots", RANKING_SNAPSHOT_COLUMNS, "Snapshot ID");
  const snapshotRows = readSimpleTableRows(snapshotContext);
  const snapshotId = String(normalization.snapshotId || getNextNumericIdFromRows(snapshotRows, "Snapshot ID"));
  const label = String(normalization.label || formatSnapshotLabel(createdAt)).trim();

  appendSimpleTableRow(snapshotContext, {
    "Created At": createdAt,
    Label: label,
    "Manager ID": managerId,
    "Ranking Type": rankingType,
    Reason: reason,
    "Snapshot ID": snapshotId,
    Source: source,
  }, RANKING_SNAPSHOT_COLUMNS);

  const itemContext = getSimpleTableContext("Ranking Snapshot Items", RANKING_SNAPSHOT_ITEM_COLUMNS, "Snapshot ID");
  snapshotItems.forEach((item, index) => {
    const rank = clampRankingRank(item.rank || item.Rank || index + 1, snapshotItems.length);
    appendSimpleTableRow(itemContext, {
      Games: Number(item.games || item.Games || item.comparisons || 0),
      "Item ID": String(item.itemId || item["Item ID"] || item.id || "").trim(),
      "Item Name": String(item.itemName || item["Item Name"] || item.name || "").trim(),
      Losses: Number(item.losses || item.Losses || 0),
      Rank: rank,
      Rating: Number(item.rating || item.Rating || RANKING_BASE_RATING),
      "Snapshot ID": snapshotId,
      Wins: Number(item.wins || item.Wins || 0),
    }, RANKING_SNAPSHOT_ITEM_COLUMNS);
  });

  resetRankingEloFromItems(rankingType, items, createdAt, managerId);

  return {
    ok: true,
    rankingType,
    snapshotId,
    status: "normalized",
  };
}

function resetRankingEloFromItems(rankingType, items, updatedAt, managerId) {
  const context = getSimpleTableContext("Ranking Elo", RANKING_ELO_COLUMNS, "Ranking Type");
  deleteSimpleTableRows(context, (row) =>
    String(row["Ranking Type"] || "").trim().toLowerCase() === String(rankingType || "").trim().toLowerCase() &&
    String(row["Manager ID"] || "").trim() === String(managerId || "").trim()
  );
  const rows = readSimpleTableRows(context);

  items.forEach((item) => {
    const nextId = getNextNumericIdFromRows(rows, "ID");
    appendSimpleTableRow(context, {
      ID: nextId,
      "Item ID": String(item.itemId || item["Item ID"] || item.id || "").trim(),
      "Last Choice ID": "",
      Losses: 0,
      "Manager ID": String(managerId || "").trim(),
      "Ranking Type": rankingType,
      Rating: Number(item.normalizedRating || item.rating || item.Rating || RANKING_BASE_RATING),
      "Updated At": updatedAt,
      Wins: 0,
    }, RANKING_ELO_COLUMNS);
    rows.push({ ID: nextId });
  });
}

function clearRankingChoicesForType(rankingType) {
  const context = getSimpleTableContext("Ranking Choices", RANKING_CHOICE_COLUMNS, "ID");
  deleteSimpleTableRows(context, (row) =>
    String(row["Ranking Type"] || "").trim().toLowerCase() === String(rankingType || "").trim().toLowerCase()
  );
}

function deleteSimpleTableRows(context, predicate) {
  readSimpleTableRows(context)
    .filter(predicate)
    .sort((first, second) => second.rowNumber - first.rowNumber)
    .forEach((row) => {
      context.sheet.deleteRow(row.rowNumber);
    });
}

function formatSnapshotLabel(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return String(value || "Snapshot").trim();
  }

  return Utilities.formatDate(date, Session.getScriptTimeZone(), "MMM d, yyyy");
}

function normalizeRankingChoice(choice) {
  return {
    ID: String(choice.ID || choice.Id || choice.id || "").trim(),
    "Ranking Type": String(choice["Ranking Type"] || choice.rankingType || choice.ranking || "").trim(),
    "Item A ID": String(choice["Item A ID"] || choice.itemAId || "").trim(),
    "Item B ID": String(choice["Item B ID"] || choice.itemBId || "").trim(),
    "Winner ID": String(choice["Winner ID"] || choice.winnerId || "").trim(),
    "Loser ID": String(choice["Loser ID"] || choice.loserId || "").trim(),
    "Manager ID": String(choice["Manager ID"] || choice.managerId || "").trim(),
    "Created At": String(choice["Created At"] || choice.createdAt || new Date().toISOString()).trim(),
  };
}

function updateRankingEloRows(choice, sheetName = "Ranking Elo") {
  const context = sheetName === "Ranking Elo"
    ? getSimpleTableContext(sheetName, RANKING_ELO_COLUMNS, "Ranking Type")
    : getOrCreateSimpleTableContext(sheetName, RANKING_ELO_COLUMNS, "ID");
  const rows = readSimpleTableRows(context);
  const winner = getRankingEloRow(rows, choice["Ranking Type"], choice["Winner ID"], choice["Manager ID"]);
  const loser = getRankingEloRow(rows, choice["Ranking Type"], choice["Loser ID"], choice["Manager ID"]);
  const expectedWinner = getRankingExpectedScore(winner.Rating, loser.Rating);
  const expectedLoser = getRankingExpectedScore(loser.Rating, winner.Rating);
  const winnerKFactor = getRankingKFactor(winner);
  const loserKFactor = getRankingKFactor(loser);
  const updatedAt = new Date().toISOString();
  const winnerNext = {
    ...winner,
    "Last Choice ID": choice.ID,
    Rating: Math.round(winner.Rating + winnerKFactor * (1 - expectedWinner)),
    "Updated At": updatedAt,
    Wins: winner.Wins + 1,
  };
  const loserNext = {
    ...loser,
    "Last Choice ID": choice.ID,
    Losses: loser.Losses + 1,
    Rating: Math.round(loser.Rating + loserKFactor * (0 - expectedLoser)),
    "Updated At": updatedAt,
  };

  upsertRankingEloRow(context, winnerNext);
  upsertRankingEloRow(context, loserNext);

  return [winnerNext, loserNext];
}

function getRankingEloRow(rows, rankingType, itemId, managerId) {
  const row = rows.find((entry) =>
    String(entry["Ranking Type"] || "").trim().toLowerCase() === String(rankingType || "").trim().toLowerCase() &&
    String(entry["Item ID"] || "").trim() === String(itemId || "").trim() &&
    String(entry["Manager ID"] || "").trim() === String(managerId || "").trim()
  );
  const seed = row ? null : getRankingSeedRow(rankingType, itemId);
  const wins = Number(row && row.Wins || 0);
  const losses = Number(row && row.Losses || 0);

  return {
    Comparisons: wins + losses,
    ID: String(row && row.ID || "").trim(),
    "Item ID": String(itemId || "").trim(),
    "Last Choice ID": String(row && row["Last Choice ID"] || "").trim(),
    Losses: losses,
    "Manager ID": String(managerId || "").trim(),
    "Ranking Type": String(rankingType || "").trim(),
    Rating: Number(row && row.Rating || seed && seed["Seed Rating"] || RANKING_BASE_RATING),
    rowNumber: row && row.rowNumber,
    "Updated At": String(row && row["Updated At"] || "").trim(),
    Wins: wins,
  };
}

function getRankingSeedRow(rankingType, itemId) {
  const context = getSimpleTableContext("Ranking Seeds", RANKING_SEED_COLUMNS, "Ranking Type");
  const rows = readSimpleTableRows(context);

  return rows.find((entry) =>
    String(entry["Ranking Type"] || "").trim().toLowerCase() === String(rankingType || "").trim().toLowerCase() &&
    String(entry["Item ID"] || "").trim() === String(itemId || "").trim()
  ) || null;
}

function upsertRankingEloRow(context, rowValues) {
  if (rowValues.rowNumber) {
    writeSimpleTableCells(context, rowValues.rowNumber, rowValues, RANKING_ELO_COLUMNS);
    return;
  }

  const rows = readSimpleTableRows(context);
  rowValues.ID = rowValues.ID || getNextNumericIdFromRows(rows, "ID");
  appendSimpleTableRow(context, rowValues, RANKING_ELO_COLUMNS);
}

function getRankingExpectedScore(rating, opponentRating) {
  return 1 / (1 + Math.pow(10, (Number(opponentRating) - Number(rating)) / 400));
}

function getRankingKFactor(row) {
  return Number(row && row.Comparisons || 0) < RANKING_PROVISIONAL_COMPARISONS
    ? RANKING_PROVISIONAL_K_FACTOR
    : RANKING_ELO_K_FACTOR;
}

function normalizeNextItem(item) {
  return {
    ID: String(item.ID || item.Id || item.id || "").trim(),
    Thing: String(item.Thing || item.thing || "").trim(),
    "Image URL": String(item["Image URL"] || item.imageUrl || "").trim(),
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

function isTrueValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["true", "yes", "y", "1", "checked"].indexOf(normalized) >= 0;
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

function readSimpleTableDisplayRows(context) {
  const lastRow = context.sheet.getLastRow();

  if (lastRow <= context.headerRow) {
    return [];
  }

  const values = context.sheet.getRange(context.headerRow + 1, 1, lastRow - context.headerRow, context.rowWidth).getDisplayValues();
  const headersByIndex = {};

  Object.entries(context.columns).forEach(([column, index]) => {
    headersByIndex[index - 1] = column;
  });

  return values
    .map((row, index) => {
      const mapped = { rowNumber: context.headerRow + 1 + index };
      let hasValue = false;

      row.forEach((value, cellIndex) => {
        const header = headersByIndex[cellIndex];

        if (!header) {
          return;
        }

        mapped[header] = value;

        if (String(value || "").trim()) {
          hasValue = true;
        }
      });

      return hasValue ? mapped : null;
    })
    .filter(Boolean);
}

function getSimpleTableContext(sheetName, requiredColumns, requiredColumn) {
  const sheet = getNextSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" was not found.`);
  }

  const header = findHeaderRow(sheet, requiredColumn);
  const headerValues = sheet.getRange(header.row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const columns = mapColumns(headerValues);
  const missingColumns = requiredColumns.filter((column) => !columns[column]);

  if (missingColumns.length > 0) {
    throw new Error(`${sheetName} table is missing columns: ${missingColumns.join(", ")}`);
  }

  return {
    columns,
    headerRow: header.row,
    rowWidth: headerValues.length,
    sheet,
    sheetName,
  };
}

function getOrCreateSimpleTableContext(sheetName, requiredColumns, requiredColumn) {
  const spreadsheet = getNextSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, requiredColumns.length).setValues([requiredColumns]);
    sheet.setFrozenRows(1);
  }
  return getSimpleTableContext(sheetName, requiredColumns, requiredColumn);
}

function readSimpleTableRows(context) {
  const lastRow = context.sheet.getLastRow();

  if (lastRow <= context.headerRow) {
    return [];
  }

  const values = context.sheet.getRange(context.headerRow + 1, 1, lastRow - context.headerRow, context.rowWidth).getValues();
  const headersByIndex = {};

  Object.entries(context.columns).forEach(([column, index]) => {
    headersByIndex[index - 1] = column;
  });

  return values
    .map((row, index) => {
      const mapped = { rowNumber: context.headerRow + 1 + index };
      let hasValue = false;

      row.forEach((value, cellIndex) => {
        const header = headersByIndex[cellIndex];

        if (!header) {
          return;
        }

        mapped[header] = value;

        if (String(value || "").trim()) {
          hasValue = true;
        }
      });

      return hasValue ? mapped : null;
    })
    .filter(Boolean);
}

function appendSimpleTableRow(context, rowValues, columnsToWrite) {
  const row = Array(context.rowWidth).fill("");

  columnsToWrite.forEach((column) => {
    row[context.columns[column] - 1] = rowValues[column] === undefined ? "" : rowValues[column];
  });

  const startRow = Math.max(context.sheet.getLastRow() + 1, context.headerRow + 1);
  context.sheet.getRange(startRow, 1, 1, context.rowWidth).setValues([row]);
}

function writeSimpleTableCells(context, rowNumber, rowValues, columnsToWrite) {
  columnsToWrite.forEach((column) => {
    context.sheet.getRange(rowNumber, context.columns[column]).setValue(rowValues[column] === undefined ? "" : rowValues[column]);
  });
}

function getNextNumericIdFromRows(rows, idColumn) {
  const maxId = rows.reduce((maxValue, row) => {
    const numericId = Number(String(row[idColumn] || "").trim());
    return Number.isInteger(numericId) && numericId > maxValue ? numericId : maxValue;
  }, 0);

  return String(maxId + 1);
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
