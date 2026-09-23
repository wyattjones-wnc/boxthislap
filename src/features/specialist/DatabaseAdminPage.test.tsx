// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseAdminPage } from "./DatabaseAdminPage";

const columns = [
  {
    name: "id",
    type: "INTEGER",
    notNull: true,
    primaryKey: 1,
    defaultValue: null,
  },
  {
    name: "name",
    type: "TEXT",
    notNull: true,
    primaryKey: 0,
    defaultValue: null,
  },
  {
    name: "Submitted_At",
    type: "TEXT",
    notNull: false,
    primaryKey: 0,
    defaultValue: null,
  },
];

beforeEach(() => {
  window.boxThisLapGetManagerAccessToken = async () => "token";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const value = url.endsWith("/api/databases")
        ? { databases: [{ id: "sample", label: "Sample" }] }
        : url.endsWith("/tables")
          ? { tables: [{ name: "items", rowCount: 1, columns }] }
          : {
              columns,
              page: 1,
              pageSize: 50,
              rowCount: 1,
              rows: [{ id: 1, name: "Example", Submitted_At: "2026-09-23" }],
            };
      return { ok: true, json: async () => value } as Response;
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete window.boxThisLapGetManagerAccessToken;
});

describe("DatabaseAdminPage", () => {
  it("requires one interaction to reveal an editor and a second to focus it", async () => {
    const user = userEvent.setup();
    render(<DatabaseAdminPage />);

    await user.selectOptions(
      await screen.findByLabelText("Database"),
      "sample",
    );
    await user.selectOptions(await screen.findByLabelText("Table"), "items");
    const cell = await screen.findByRole("button", {
      name: "Edit name, row 1",
    });

    await user.click(cell);
    const editor = screen.getByRole("textbox", { name: "name, row 1 editor" });
    expect(document.activeElement).not.toBe(editor);

    await user.click(editor);
    expect(document.activeElement).toBe(editor);
  });

  it("requests server-side sorting and date-range filters", async () => {
    const user = userEvent.setup();
    render(<DatabaseAdminPage />);
    await user.selectOptions(
      await screen.findByLabelText("Database"),
      "sample",
    );
    await user.selectOptions(await screen.findByLabelText("Table"), "items");
    await screen.findByRole("button", { name: "Edit name, row 1" });

    await user.click(screen.getByRole("button", { name: "Sort by name" }));
    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(([input]) =>
            String(input).includes("sort=name&direction=asc"),
          ),
      ).toBe(true),
    );

    await user.click(screen.getByRole("button", { name: "Add filter" }));
    await user.selectOptions(screen.getByLabelText("Column"), "Submitted_At");
    await user.type(screen.getByLabelText("From"), "2026-09-01");
    await user.type(screen.getByLabelText("Through"), "2026-09-30");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => {
      const requestUrl = vi
        .mocked(fetch)
        .mock.calls.map(([input]) => String(input))
        .find((url) => new URL(url).searchParams.has("filters"));
      const applied = JSON.parse(
        new URL(requestUrl || "https://invalid.test").searchParams.get(
          "filters",
        ) || "[]",
      );
      expect(applied).toEqual([
        {
          column: "Submitted_At",
          operator: "date_between",
          value: "2026-09-01",
          value2: "2026-09-30",
        },
      ]);
    });
  });
});
