const FANTASY_CRITIC_LEAGUE_ID = "f29fddba-fa80-40bf-aa71-d062e6e80635";
const FANTASY_CRITIC_ALLOWED_YEARS = new Set(["2025", "2026"]);

function doGet(event) {
  const year = String(event?.parameter?.year || "").trim();
  const callback = String(event?.parameter?.callback || "").trim();

  if (!FANTASY_CRITIC_ALLOWED_YEARS.has(year)) {
    return createFantasyCriticResponse_(callback, { ok: false, error: "Invalid Fantasy Critic year." });
  }

  try {
    const url = "https://www.fantasycritic.games/api/League/GetLeagueYear" +
      `?leagueID=${encodeURIComponent(FANTASY_CRITIC_LEAGUE_ID)}` +
      `&year=${encodeURIComponent(year)}`;
    const response = UrlFetchApp.fetch(url, {
      headers: { Accept: "application/json" },
      muteHttpExceptions: true,
    });
    const status = response.getResponseCode();

    if (status < 200 || status >= 300) {
      return createFantasyCriticResponse_(callback, {
        ok: false,
        error: `Fantasy Critic returned HTTP ${status}.`,
      });
    }

    return createFantasyCriticResponse_(callback, {
      data: JSON.parse(response.getContentText()),
      ok: true,
      year,
    });
  } catch (error) {
    return createFantasyCriticResponse_(callback, {
      ok: false,
      error: String(error?.message || error),
    });
  }
}

function createFantasyCriticResponse_(callback, payload) {
  if (callback) {
    if (!/^[A-Za-z_$][\w$]*$/.test(callback)) {
      return ContentService
        .createTextOutput("/* Invalid callback. */")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(payload)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
