import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyGallery,
  matchGalleryToFixture,
  parseGalleryImages,
  parseGalleryLinks,
  parseGettyEmbeds,
  recentCompletedFixtures,
} from "./sources.mjs";

test("Barcelona discovery and asset extraction normalize gallery data", () => {
  const index = `<article><a href="/en/football/first-team/photos/123/photos-from-the-win-over-sevilla" title="Photos from the win over Sevilla">26 photos</a><time datetime="2026-09-19T22:00:00Z"></time></article>`;
  const [gallery] = parseGalleryLinks(
    index,
    "https://www.fcbarcelona.com/en/football/first-team/photos",
    "barcelona",
  );
  assert.equal(gallery.sourceGalleryId, "123");
  assert.match(gallery.title, /Sevilla/i);
  const images = parseGalleryImages(
    `<script>{"image":{"url":"https://media.fcbarcelona.com/gallery/win-1.jpg"}}</script><img src="https://media.fcbarcelona.com/gallery/win-2.webp">`,
    gallery,
  );
  assert.equal(images.length, 2);
});

test("Arsenal discovery accepts gallery routes without relying on headline wording", () => {
  const galleries = parseGalleryLinks(
    `<a href="/gallery/matchday-a1" aria-label="Our afternoon at the Emirates"></a>`,
    "https://www.arsenal.com/news/men/1",
    "arsenal",
  );
  assert.equal(galleries.length, 1);
  assert.equal(galleries[0].sourceGalleryId, "matchday-a1");
});

test("fixture matching applies the documented confidence threshold", () => {
  const result = matchGalleryToFixture(
    {
      teamId: "1",
      title: "Photos from the win over Chelsea",
      publishedAt: "2026-09-20T20:00:00Z",
      category: "match",
    },
    [
      {
        teamId: "1",
        opponent: "Chelsea FC",
        matchId: "fixture-1",
        timestamp: "2026-09-20T18:00:00Z",
        league: "Premier League",
        venue: "Emirates Stadium",
      },
    ],
  );
  assert.equal(result.matchStatus, "auto");
  assert.equal(result.matchId, "fixture-1");
  assert.ok(result.matchConfidence >= 90);
});

test("Getty ingestion only accepts explicit embed URLs", () => {
  const values = parseGettyEmbeds(
    `<img src="https://media.gettyimages.com/id/123/photo.jpg"><iframe src="https://embed.gettyimages.com/embed/456?et=test"></iframe>`,
    "https://www.gettyimages.com/photos/arsenal",
  );
  assert.equal(values.length, 1);
  assert.equal(values[0].sourceImageKey, "456");
  assert.equal(values[0].renderMode, "getty_embed");
});

test("recent completed fixtures selects only followed teams and final states", () => {
  const now = Date.parse("2026-09-28T12:00:00Z");
  const schedule = {
    teamSchedules: [
      {
        team: { id: "1", name: "Arsenal" },
        fixtures: [
          { matchId: "done", status: "FT", timestamp: "2026-09-27T12:00:00Z" },
          {
            matchId: "future",
            status: "TIMED",
            timestamp: "2026-09-29T12:00:00Z",
          },
        ],
      },
      {
        team: { id: "3", name: "Wrexham" },
        fixtures: [
          { matchId: "other", status: "FT", timestamp: "2026-09-27T12:00:00Z" },
        ],
      },
    ],
  };
  assert.deepEqual(
    recentCompletedFixtures(schedule, now).map((fixture) => fixture.matchId),
    ["done"],
  );
  assert.equal(
    classifyGallery("Behind the scenes after the final"),
    "behind_scenes",
  );
});
