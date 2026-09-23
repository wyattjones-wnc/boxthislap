import { useCallback, useEffect, useMemo, useState } from "react";
import { DATABASE_ADMIN_ENDPOINT } from "../../../modules/siteConfig";

type Database = { id: string; label: string };
type Column = {
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: number;
  defaultValue: unknown;
};
type Table = { name: string; rowCount: number; columns: Column[] };
type Row = Record<string, unknown>;

declare global {
  interface Window {
    boxThisLapGetManagerAccessToken?: () => Promise<string>;
  }
}

async function getAccessTokenBridge() {
  if (!window.boxThisLapGetManagerAccessToken) {
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, 5000);
      window.addEventListener(
        "boxthislap:manager-auth-ready",
        () => {
          window.clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );
    });
  }
  return window.boxThisLapGetManagerAccessToken?.();
}

async function request(path: string, options: RequestInit = {}) {
  const token = await getAccessTokenBridge();
  if (!token) throw new Error("Sign in again to open Database Explorer.");
  const response = await fetch(`${DATABASE_ADMIN_ENDPOINT}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error || "Database request failed.");
  return value;
}

function jsonValue(value: unknown) {
  return JSON.stringify(value) ?? "null";
}

export function DatabaseAdminPage() {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [databaseId, setDatabaseId] = useState("");
  const [tables, setTables] = useState<Table[]>([]);
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Record<string, string>>>(
    {},
  );
  const [page, setPage] = useState(1);
  const [rowCount, setRowCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Choose a database to inspect its tables and schema.",
  );

  useEffect(() => {
    void request("/api/databases")
      .then((value) => setDatabases(value.databases))
      .catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    setTables([]);
    setTableName("");
    setRows([]);
    setColumns([]);
    setPage(1);
    if (!databaseId) return;
    setBusy(true);
    setMessage("Loading tables…");
    void request(`/api/databases/${encodeURIComponent(databaseId)}/tables`)
      .then((value) => {
        setTables(value.tables);
        setMessage(`${value.tables.length} tables found.`);
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setBusy(false));
  }, [databaseId]);

  const loadRows = useCallback(
    (nextPage: number) => {
      if (!databaseId || !tableName) return;
      setBusy(true);
      setMessage("Loading rows…");
      void request(
        `/api/databases/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableName)}/rows?page=${nextPage}`,
      )
        .then((value) => {
          setColumns(value.columns);
          setRows(value.rows);
          setRowCount(value.rowCount);
          setPage(value.page);
          setDrafts({});
          setMessage(
            `${value.rowCount.toLocaleString()} rows · showing ${value.rows.length ? (value.page - 1) * value.pageSize + 1 : 0}–${Math.min(value.page * value.pageSize, value.rowCount)}`,
          );
        })
        .catch((error) => setMessage(error.message))
        .finally(() => setBusy(false));
    },
    [databaseId, tableName],
  );

  useEffect(() => {
    loadRows(1);
  }, [loadRows]);
  const selectedTable = tables.find((table) => table.name === tableName);
  const primaryKeys = useMemo(
    () => columns.filter((column) => column.primaryKey),
    [columns],
  );

  function changeCell(rowIndex: number, name: string, value: string) {
    setDrafts((current) => ({
      ...current,
      [rowIndex]: { ...(current[rowIndex] || {}), [name]: value },
    }));
  }

  async function saveRow(rowIndex: number) {
    const draft = drafts[rowIndex];
    if (!draft) return;
    let changes: Row;
    try {
      changes = Object.fromEntries(
        Object.entries(draft).map(([name, value]) => [name, JSON.parse(value)]),
      );
    } catch {
      setMessage(
        "Every edited value must be valid JSON. Use quoted text, a number, true, false, or null.",
      );
      return;
    }
    const row = rows[rowIndex];
    const key = Object.fromEntries(
      primaryKeys.map((column) => [column.name, row[column.name]]),
    );
    setBusy(true);
    setMessage("Saving row…");
    try {
      const value = await request(
        `/api/databases/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableName)}/rows`,
        { method: "PATCH", body: JSON.stringify({ key, changes }) },
      );
      setRows((current) =>
        current.map((item, index) => (index === rowIndex ? value.row : item)),
      );
      setDrafts((current) => {
        const next = { ...current };
        delete next[rowIndex];
        return next;
      });
      setMessage("Row saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Row save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="section-heading">
        <a
          className="back-link"
          href="#the-monster-maniac"
          data-page-link="the-monster-maniac"
        >
          Admin Home
        </a>
        <p className="eyebrow">Administration</p>
        <h1>Database Explorer</h1>
        <p>
          Browse every application database and make targeted row corrections.
          Values are edited as JSON so types and nulls remain explicit.
        </p>
      </div>
      <div className="database-admin-controls">
        <label>
          <span>Database</span>
          <select
            value={databaseId}
            onChange={(event) => setDatabaseId(event.target.value)}
          >
            <option value="">Choose a database</option>
            {databases.map((database) => (
              <option value={database.id} key={database.id}>
                {database.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Table</span>
          <select
            value={tableName}
            disabled={!tables.length}
            onChange={(event) => {
              setTableName(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Choose a table</option>
            {tables.map((table) => (
              <option value={table.name} key={table.name}>
                {table.name} ({table.rowCount.toLocaleString()})
              </option>
            ))}
          </select>
        </label>
      </div>
      {selectedTable && (
        <details className="database-schema">
          <summary>
            Table structure · {selectedTable.columns.length} columns
          </summary>
          <dl>
            {selectedTable.columns.map((column) => (
              <div key={column.name}>
                <dt>
                  {column.name}
                  {column.primaryKey ? " 🔑" : ""}
                </dt>
                <dd>
                  {column.type || "ANY"}
                  {column.notNull ? " · required" : " · nullable"}
                  {column.defaultValue !== null
                    ? ` · default ${String(column.defaultValue)}`
                    : ""}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      <p className="database-admin-status" role="status">
        {busy ? "Working… " : ""}
        {message}
      </p>
      {!!columns.length && (
        <>
          <div className="table-wrap database-admin-table-wrap">
            <table className="database-admin-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.name}>
                      {column.name}
                      <small>{column.type || "ANY"}</small>
                    </th>
                  ))}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={
                      primaryKeys
                        .map((column) => String(row[column.name]))
                        .join(":") || rowIndex
                    }
                  >
                    {columns.map((column) => {
                      const locked = Boolean(column.primaryKey);
                      const value =
                        drafts[rowIndex]?.[column.name] ??
                        jsonValue(row[column.name]);
                      return (
                        <td key={column.name}>
                          <textarea
                            aria-label={`${column.name}, row ${rowIndex + 1}`}
                            value={value}
                            readOnly={locked}
                            rows={Math.min(
                              4,
                              Math.max(1, value.split("\n").length),
                            )}
                            onChange={(event) =>
                              changeCell(
                                rowIndex,
                                column.name,
                                event.target.value,
                              )
                            }
                          />
                        </td>
                      );
                    })}
                    <td>
                      <button
                        className="action-button"
                        type="button"
                        disabled={
                          busy || !drafts[rowIndex] || !primaryKeys.length
                        }
                        onClick={() => void saveRow(rowIndex)}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="database-admin-pagination">
            <button
              type="button"
              disabled={busy || page <= 1}
              onClick={() => loadRows(page - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(rowCount / 50))}
            </span>
            <button
              type="button"
              disabled={busy || page * 50 >= rowCount}
              onClick={() => loadRows(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </>
  );
}
