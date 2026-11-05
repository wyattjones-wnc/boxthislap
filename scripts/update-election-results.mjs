import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

// NPR publishes AP-tabulated results; keep a same-origin snapshot because its
// public JSON endpoints do not permit cross-origin browser requests.
const base = "https://apps.npr.org/2026-election-results/";
const races = (
  await Promise.all(
    ["senate"].map(async (office) => {
      const data = JSON.parse(
        execFileSync(
          "curl",
          [
            "--compressed",
            "--fail",
            "--silent",
            "--show-error",
            "--max-time",
            "30",
            `${base}data/${office}.json`,
          ],
          { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
        ),
      );
      if (!Array.isArray(data.results))
        throw new Error(`Invalid NPR ${office} feed`);
      return data.results.filter(
        (race) =>
          ["AK", "MS"].includes(race.state) &&
          race.test === false &&
          race.resultsType === "live",
      );
    }),
  )
).flat();
for (const state of ["AK", "MS"]) {
  if (!races.some((race) => race.state === state))
    throw new Error(`No live results for ${state}`);
}
await writeFile(
  new URL("../data/election-results.json", import.meta.url),
  JSON.stringify(
    {
      year: 2026,
      fetchedAt: new Date().toISOString(),
      source: base,
      races,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Updated ${races.length} Alaska and Mississippi races from NPR/AP.`,
);
