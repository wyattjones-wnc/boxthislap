import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyGallery,
  matchGalleryToFixture,
  normalizeDiscoveredGallery,
  parseArsenalGalleryId,
  parseArsenalGalleryResponse,
  parseArsenalSitemap,
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
  assert.deepEqual(
    new Set(images.map((image) => image.normalizedUrl)),
    new Set([
      "https://media.fcbarcelona.com/gallery/win-1.jpg?width=1200",
      "https://media.fcbarcelona.com/gallery/win-2.webp?width=1200",
    ]),
  );
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

test("Arsenal discovery reads recent galleries from its article sitemap", () => {
  const xml = `<urlset>
    <url><loc>https://www.arsenal.com/photos/north-london-derby-action-a12345678901</loc><lastmod>2026-09-28T12:00:00Z</lastmod></url>
    <url><loc>https://www.arsenal.com/news/gallery-training-session-a12345678902</loc><lastmod>2026-09-27T12:00:00Z</lastmod></url>
    <url><loc>https://www.arsenal.com/news/ordinary-story-a12345678903</loc><lastmod>2026-09-27T12:00:00Z</lastmod></url>
  </urlset>`;
  const galleries = parseArsenalSitemap(
    xml,
    Date.parse("2026-09-29T12:00:00Z"),
  );
  assert.equal(galleries.length, 2);
  assert.equal(galleries[0].title, "north london derby action");
});

test("Arsenal extraction uses only the exact structured gallery images", () => {
  const page = `<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"article":{"articleBody":[{"type":"HEADER","image":"https://assets.arsenal.com/header.webp"},{"type":"GALLERY","id":"5603"}]}}}}</script>`;
  assert.equal(parseArsenalGalleryId(page), "5603");
  const gallery = {
    sourceUrl: "https://www.arsenal.com/news/gallery-37-photos",
  };
  const images = parseArsenalGalleryResponse(
    {
      data: {
        singleGallery: {
          images: [
            {
              caption: "First photo",
              copyright: "Arsenal FC",
              url: "https://assets.arsenal.com/prod/images/large_landscape/first.jpg",
              list: [
                {
                  type: "xxl_landscape",
                  url: "https://assets.arsenal.com/prod/images/xxl_landscape/first.jpg",
                },
              ],
            },
            {
              caption: "Second photo",
              url: "https://assets.arsenal.com/prod/images/large_landscape/second.jpg",
            },
          ],
        },
      },
    },
    gallery,
  );
  assert.equal(images.length, 2);
  assert.match(images[0].sourceImageUrl, /xxl_landscape\/first\.jpg$/);
  assert.equal(images[0].caption, "First photo");
  assert.equal(images[0].credit, "Arsenal FC");
  assert.equal(images[1].ordinal, 1);
});

test("Arsenal preserves original portrait images ahead of landscape crops", () => {
  const original =
    "https://assets.arsenal.com/prod/images/original/portrait.jpg";
  const landscape =
    "https://assets.arsenal.com/prod/images/xxl_landscape/portrait.jpg";
  const gallery = {
    sourceUrl: "https://www.arsenal.com/news/training-gallery",
  };
  const extract = (image) =>
    parseArsenalGalleryResponse(
      {
        data: { singleGallery: { images: [image] } },
      },
      gallery,
    )[0];
  const cropped = {
    url: landscape,
    list: [{ type: "xxl_landscape", url: landscape }],
  };
  assert.equal(
    extract({ ...cropped, originalUrl: original }).sourceImageUrl,
    original,
  );
  const fromRenditions = extract({
    ...cropped,
    list: [...cropped.list, { type: "original", url: original }],
  });
  assert.equal(fromRenditions.sourceImageUrl, original);
  assert.equal(fromRenditions.sourceImageKey, extract(cropped).sourceImageKey);
  assert.equal(fromRenditions.id, extract(cropped).id);
  assert.equal(extract(cropped).sourceImageUrl, landscape);
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

  const nextDay = matchGalleryToFixture(
    {
      teamId: "2",
      title: "Photos from the win over Sevilla",
      publishedAt: "2026-09-20T20:00:00Z",
      category: "match",
    },
    [
      {
        teamId: "2",
        opponent: "Sevilla FC",
        matchId: "fixture-2",
        timestamp: "2026-09-19T19:00:00Z",
      },
    ],
  );
  assert.equal(nextDay.matchStatus, "auto");
  assert.equal(nextDay.matchId, "fixture-2");
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
            matchId: "stale-status",
            status: "TIMED",
            timestamp: "2026-09-27T18:00:00Z",
          },
          {
            matchId: "postponed",
            status: "POSTPONED",
            timestamp: "2026-09-27T18:00:00Z",
          },
          {
            matchId: "still-playing",
            status: "TIMED",
            timestamp: "2026-09-28T10:00:00Z",
          },
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
    ["done", "stale-status"],
  );
  assert.equal(
    classifyGallery("Behind the scenes after the final"),
    "behind_scenes",
  );
  assert.equal(classifyGallery("First-team training session"), "training");
  const training = normalizeDiscoveredGallery(
    {
      source: "arsenal",
      sourceGalleryId: "training",
      sourceUrl: "https://www.arsenal.com/news/training",
      title: "First-team training session",
      publishedAt: new Date(now).toISOString(),
    },
    "1",
    [],
    [{ id: "training-image" }],
    new Date(now).toISOString(),
  );
  assert.equal(training.matchStatus, "review");
  assert.equal(training.images.length, 1);
});
