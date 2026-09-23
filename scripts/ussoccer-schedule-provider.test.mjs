import assert from "node:assert/strict";
import test from "node:test";
import { parseUsSoccerSchedule } from "./ussoccer-schedule-provider.mjs";

test("extracts match records from React Flight schedule data", () => {
  const event = {
    id: "match-1",
    date: "2026-09-26T20:30:00.000Z",
    venue: { longName: "Inter.co Stadium", location: "Orlando, FL" },
    competition: { id: "friendly", name: "International Friendly" },
    contestants: [
      { id: "usa", name: "United States", position: "home" },
      { id: "peru", name: "Peru", position: "away" },
    ],
  };
  const flightData = JSON.stringify({ schedule: { events: [event] } });
  const html = `<script>self.__next_f.push([1,${JSON.stringify(flightData)}])</script>`;

  assert.deepEqual(parseUsSoccerSchedule(html), [event]);
});

test("deduplicates repeated schedule records", () => {
  const event = {
    id: "match-1",
    date: "2026-10-10T18:30:00.000Z",
    competition: { name: "International Friendly Games Women" },
    contestants: [{ name: "United States" }, { name: "Spain" }],
  };
  const flightData = `${JSON.stringify(event)}${JSON.stringify(event)}`;
  const html = `<script>self.__next_f.push([1,${JSON.stringify(flightData)}])</script>`;

  assert.equal(parseUsSoccerSchedule(html).length, 1);
});
