import assert from "node:assert/strict";
import test from "node:test";
import { parseUsSoccerRoster } from "./ussoccer-roster-provider.mjs";

test("parses and deduplicates rendered U.S. Soccer roster cards", () => {
  const card = `<section class="PlayerThumbnail_PlayerThumbnail__abc">
    <a href="/players/a/tyler-adams">
      <img src="https://content.ussoccer.com/tyler-adams.png?width=640&amp;height=640" alt="">
      <div class="PlayerThumbnail_playerName__abc">4<!-- --> <!-- -->Tyler Adams</div>
      <div class="PlayerThumbnail_playerPosition__abc">Midfielder</div>
    </a>
  </section>`;

  assert.deepEqual(parseUsSoccerRoster(`${card}${card}`), [{
    id: "a/tyler-adams",
    name: "Tyler Adams",
    position: "Midfielder",
    number: "4",
    profileImage: "https://content.ussoccer.com/tyler-adams.png?width=640&height=640",
    cardImage: "https://content.ussoccer.com/tyler-adams.png?width=640&height=640",
    homeCountry: "United States",
  }]);
});

test("supports roster cards without a jersey number", () => {
  const html = `<section class="PlayerThumbnail_PlayerThumbnail__abc">
    <a href="/players/h/lindsey-heaps">
      <img src="https://content.ussoccer.com/lindsey-heaps.png" alt="">
      <div class="PlayerThumbnail_playerName__abc"><!-- -->Lindsey Heaps</div>
      <div class="PlayerThumbnail_playerPosition__abc">Midfielder</div>
    </a>
  </section>`;

  assert.equal(parseUsSoccerRoster(html)[0].name, "Lindsey Heaps");
  assert.equal(parseUsSoccerRoster(html)[0].number, "");
});
