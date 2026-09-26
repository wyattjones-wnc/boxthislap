import assert from "node:assert/strict";
import test from "node:test";
import { parseLegacyDraft } from "./import-fantasy-office-2026.mjs";

test("converts the published matrix into active picks and substitutes", () => {
  const movies = parseLegacyDraft(
    "#,D1,D2\r\n,Manager One,Manager Two\r\n1,Movie A,Movie B\r\nSub,Movie C,Movie D\r\n",
  );
  assert.deepEqual(movies, [
    {
      active: true,
      draftNumber: "D1",
      manager: "Manager One",
      substitute: false,
      title: "Movie A",
    },
    {
      active: false,
      draftNumber: "Sub",
      manager: "Manager One",
      substitute: true,
      title: "Movie C",
    },
    {
      active: true,
      draftNumber: "D1",
      manager: "Manager Two",
      substitute: false,
      title: "Movie B",
    },
    {
      active: false,
      draftNumber: "Sub",
      manager: "Manager Two",
      substitute: true,
      title: "Movie D",
    },
  ]);
});
