const DATABASES = Object.freeze({
  rankings: { binding: "RANKINGS_DB", label: "Rankings & managers" },
  next: { binding: "NEXT_DB", label: "Next items" },
  guides: { binding: "GUIDES_DB", label: "Guide progress" },
  footy: { binding: "FOOTY_NOTES_DB", label: "Footy notes & rosters" },
  psn: { binding: "PSN_DB", label: "PSN trophies" },
  youtube: { binding: "YOUTUBE_DB", label: "YouTube inbox" },
  formulaOne: { binding: "FORMULA_ONE_DB", label: "Formula One" },
});

// Authentication material may be inspected in its owning workflow, but must never be
// returned by a generic data browser where a copied page response could expose it.
const HIDDEN_TABLES = new Set(["psn_auth"]);
const PAGE_SIZE = 50;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin, env);
    if (request.method === "OPTIONS")
      return new Response(null, {
        status: allowedOrigin(origin, env) ? 204 : 403,
        headers,
      });
    if (origin && !allowedOrigin(origin, env))
      return json({ ok: false, error: "Origin is not allowed." }, 403, headers);

    try {
      const admin = await requireAdmin(request, env);
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/api/databases") {
        return json(
          {
            ok: true,
            databases: Object.entries(DATABASES).map(([id, value]) => ({
              id,
              label: value.label,
            })),
          },
          200,
          headers,
        );
      }
      const tablesMatch = url.pathname.match(
        /^\/api\/databases\/([^/]+)\/tables$/,
      );
      if (request.method === "GET" && tablesMatch)
        return json(
          { ok: true, tables: await listTables(database(env, tablesMatch[1])) },
          200,
          headers,
        );

      const rowsMatch = url.pathname.match(
        /^\/api\/databases\/([^/]+)\/tables\/([^/]+)\/rows$/,
      );
      if (rowsMatch && request.method === "GET") {
        const db = database(env, rowsMatch[1]);
        const table = decodeURIComponent(rowsMatch[2]);
        const schema = await tableSchema(db, table);
        const page = Math.max(
          1,
          Number.parseInt(url.searchParams.get("page") || "1", 10) || 1,
        );
        return json(
          {
            ok: true,
            ...(await readRows(db, table, schema, page, {
              direction: url.searchParams.get("direction"),
              filters: url.searchParams.get("filters"),
              sort: url.searchParams.get("sort"),
            })),
          },
          200,
          headers,
        );
      }
      if (rowsMatch && request.method === "PATCH") {
        const db = database(env, rowsMatch[1]);
        const table = decodeURIComponent(rowsMatch[2]);
        const schema = await tableSchema(db, table);
        const body = await readBody(request);
        return json(
          {
            ok: true,
            row: await updateRow(db, table, schema, body),
            updatedBy: admin.managerId,
          },
          200,
          headers,
        );
      }
      throw httpError(404, "Database admin route was not found.");
    } catch (error) {
      return json(
        {
          ok: false,
          error: error?.message || "Database admin request failed.",
        },
        error?.status || 500,
        headers,
      );
    }
  },
};

function database(env, id) {
  const config = DATABASES[id];
  if (!config || !env[config.binding])
    throw httpError(404, "Database was not found.");
  return env[config.binding];
}

async function listTables(db) {
  const result = await db.prepare("PRAGMA table_list").all();
  const tables = [];
  const applicationTables = (result.results || [])
    .filter(
      (row) =>
        row.schema === "main" &&
        row.type === "table" &&
        !String(row.name || "").startsWith("sqlite_") &&
        !String(row.name || "").startsWith("_cf_"),
    )
    .sort((left, right) => String(left.name).localeCompare(String(right.name)));
  for (const row of applicationTables) {
    if (HIDDEN_TABLES.has(String(row.name))) continue;
    const schema = await tableSchema(db, row.name);
    const count = await db
      .prepare(`SELECT COUNT(*) AS count FROM ${quote(row.name)}`)
      .first();
    tables.push({
      name: row.name,
      rowCount: Number(count?.count || 0),
      columns: schema,
    });
  }
  return tables;
}

async function tableSchema(db, table) {
  assertIdentifier(table);
  if (HIDDEN_TABLES.has(table))
    throw httpError(
      403,
      "This table contains authentication secrets and is not available here.",
    );
  const result = await db.prepare(`PRAGMA table_info(${quote(table)})`).all();
  if (!(result.results || []).length)
    throw httpError(404, "Table was not found.");
  return result.results.map((column) => ({
    name: String(column.name),
    type: String(column.type || ""),
    notNull: Boolean(column.notnull),
    primaryKey: Number(column.pk || 0),
    defaultValue: column.dflt_value ?? null,
  }));
}

async function readRows(db, table, schema, page, options = {}) {
  const offset = (page - 1) * PAGE_SIZE;
  const primaryKeys = schema
    .filter((column) => column.primaryKey)
    .sort((a, b) => a.primaryKey - b.primaryKey);
  const columnNames = new Set(schema.map((column) => column.name));
  const filters = parseFilters(options.filters, columnNames);
  const whereParts = [];
  const bindings = [];
  for (const filter of filters) {
    const column = quote(filter.column);
    if (filter.operator === "equals") {
      whereParts.push(`CAST(${column} AS TEXT) = ?`);
      bindings.push(filter.value);
    } else if (filter.operator === "contains") {
      whereParts.push(`CAST(${column} AS TEXT) LIKE ? ESCAPE '\\'`);
      bindings.push(`%${escapeLike(filter.value)}%`);
    } else if (filter.operator === "is_null") {
      whereParts.push(`${column} IS NULL`);
    } else if (filter.operator === "is_not_null") {
      whereParts.push(`${column} IS NOT NULL`);
    } else if (filter.operator === "date_on_or_after") {
      whereParts.push(`date(${column}) >= date(?)`);
      bindings.push(filter.value);
    } else if (filter.operator === "date_on_or_before") {
      whereParts.push(`date(${column}) <= date(?)`);
      bindings.push(filter.value);
    } else if (filter.operator === "date_between") {
      whereParts.push(`date(${column}) BETWEEN date(?) AND date(?)`);
      bindings.push(filter.value, filter.value2);
    }
  }
  const whereSql = whereParts.length
    ? ` WHERE ${whereParts.join(" AND ")}`
    : "";
  const requestedSort = String(options.sort || "");
  const sortColumn = columnNames.has(requestedSort) ? requestedSort : "";
  const direction =
    String(options.direction || "").toLowerCase() === "desc" ? "DESC" : "ASC";
  const orderColumns = sortColumn
    ? [
        `${quote(sortColumn)} ${direction}`,
        ...primaryKeys
          .filter((column) => column.name !== sortColumn)
          .map((column) => `${quote(column.name)} ASC`),
      ]
    : primaryKeys.map((column) => `${quote(column.name)} ASC`);
  const orderSql = orderColumns.length
    ? ` ORDER BY ${orderColumns.join(", ")}`
    : "";
  const result = await db
    .prepare(
      `SELECT * FROM ${quote(table)}${whereSql}${orderSql} LIMIT ? OFFSET ?`,
    )
    .bind(...bindings, PAGE_SIZE, offset)
    .all();
  const countStatement = db.prepare(
    `SELECT COUNT(*) AS count FROM ${quote(table)}${whereSql}`,
  );
  const count = bindings.length
    ? await countStatement.bind(...bindings).first()
    : await countStatement.first();
  return {
    columns: schema,
    page,
    pageSize: PAGE_SIZE,
    rowCount: Number(count?.count || 0),
    rows: result.results || [],
  };
}

function parseFilters(rawFilters, columnNames) {
  if (!rawFilters) return [];
  let filters;
  try {
    filters = JSON.parse(rawFilters);
  } catch {
    throw httpError(400, "Filters must be valid JSON.");
  }
  if (!Array.isArray(filters) || filters.length > 8)
    throw httpError(400, "Up to eight filters may be applied.");
  const operators = new Set([
    "contains",
    "equals",
    "is_null",
    "is_not_null",
    "date_on_or_after",
    "date_on_or_before",
    "date_between",
  ]);
  return filters.map((filter) => {
    const column = String(filter?.column || "");
    const operator = String(filter?.operator || "");
    if (!columnNames.has(column) || !operators.has(operator))
      throw httpError(400, "A filter column or operator is invalid.");
    const needsValue = !["is_null", "is_not_null"].includes(operator);
    const value = needsValue ? String(filter.value ?? "").trim() : "";
    const value2 =
      operator === "date_between" ? String(filter.value2 ?? "").trim() : "";
    if (needsValue && !value)
      throw httpError(400, "A filter value is required.");
    if (operator === "date_between" && !value2)
      throw httpError(400, "Both dates are required for a date range.");
    return { column, operator, value, value2 };
  });
}

function escapeLike(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}

async function updateRow(db, table, schema, body) {
  const primaryKeys = schema
    .filter((column) => column.primaryKey)
    .sort((a, b) => a.primaryKey - b.primaryKey);
  if (!primaryKeys.length)
    throw httpError(
      400,
      "Rows in this table cannot be edited because the table has no primary key.",
    );
  if (
    !body?.key ||
    !body?.changes ||
    typeof body.changes !== "object" ||
    Array.isArray(body.changes)
  )
    throw httpError(400, "A row key and changes are required.");
  const columnNames = new Set(schema.map((column) => column.name));
  const changes = Object.entries(body.changes).filter(
    ([name]) =>
      columnNames.has(name) && !primaryKeys.some((key) => key.name === name),
  );
  if (!changes.length)
    throw httpError(400, "No editable column changes were supplied.");
  const where = primaryKeys
    .map((column) => {
      if (!(column.name in body.key))
        throw httpError(400, `Primary key ${column.name} is required.`);
      return `${quote(column.name)} IS ?`;
    })
    .join(" AND ");
  const statement = db
    .prepare(
      `UPDATE ${quote(table)} SET ${changes.map(([name]) => `${quote(name)} = ?`).join(", ")} WHERE ${where}`,
    )
    .bind(
      ...changes.map(([, value]) => value),
      ...primaryKeys.map((column) => body.key[column.name]),
    );
  const result = await statement.run();
  if (!result.success || Number(result.meta?.changes || 0) !== 1)
    throw httpError(
      409,
      "The row was not updated. It may have changed or been removed.",
    );
  return db
    .prepare(`SELECT * FROM ${quote(table)} WHERE ${where}`)
    .bind(...primaryKeys.map((column) => body.key[column.name]))
    .first();
}

async function requireAdmin(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer "))
    throw httpError(401, "Sign in as an admin to browse databases.");
  if (!env.MANAGER_AUTH)
    throw new Error("Manager authorization is not configured.");
  const response = await env.MANAGER_AUTH.fetch(
    "https://rankings.internal/api/auth/verify",
    {
      method: "POST",
      headers: { Accept: "application/json", Authorization: authorization },
    },
  );
  const value = await response.json().catch(() => null);
  if (!response.ok || !value?.ok || !value.managerId)
    throw httpError(401, value?.error || "Manager authorization is invalid.");
  const managerId = String(value.managerId);
  const admins = new Set(
    String(env.ADMIN_MANAGER_IDS || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  if (!admins.has(managerId))
    throw httpError(403, "Only an admin can browse databases.");
  return { managerId };
}

function assertIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value))
    throw httpError(400, "Invalid database identifier.");
}
function quote(value) {
  assertIdentifier(value);
  return `"${value}"`;
}
async function readBody(request) {
  const value = await request.json().catch(() => null);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw httpError(400, "A JSON object is required.");
  return value;
}
function allowedOrigin(origin, env) {
  return (
    !origin ||
    String(env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .includes(origin)
  );
}
function corsHeaders(origin, env) {
  const headers = {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
  if (origin && allowedOrigin(origin, env))
    headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function json(value, status, headers) {
  return new Response(JSON.stringify(value), { status, headers });
}
function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
