const US_SOCCER_BASE_URL = "https://www.ussoccer.com";

export async function loadUsSoccerSchedule(teamSlug, fetchImpl = fetch) {
  const slug = String(teamSlug || "").trim().toLowerCase();
  if (!slug) return [];

  const response = await fetchImpl(`${US_SOCCER_BASE_URL}/schedule-tickets/${encodeURIComponent(slug)}`, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "BoxThisLap/1.0 (+https://github.com/wyattjones-wnc/boxthislap)",
    },
  });
  if (!response.ok) throw new Error(`U.S. Soccer ${slug} schedule returned ${response.status}.`);
  return parseUsSoccerSchedule(await response.text());
}

export function parseUsSoccerSchedule(html) {
  const stream = decodeNextFlightStream(html);
  const events = new Map();
  const objectStarts = [];
  let inString = false;
  let escaped = false;

  for (let index = 0; index < stream.length; index += 1) {
    const character = stream[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{") {
      objectStarts.push(index);
      continue;
    }
    if (character !== "}" || objectStarts.length === 0) continue;

    const start = objectStarts.pop();
    const candidate = stream.slice(start, index + 1);
    if (candidate.length > 100_000 || !candidate.includes('"contestants":') || !candidate.includes('"date":')) continue;

    try {
      const event = JSON.parse(candidate);
      if (!event?.date || !Array.isArray(event.contestants) || event.contestants.length < 2) continue;
      const key = String(event.id || `${event.date}|${event.contestants.map((team) => team?.name || team?.officialName).join("|")}`);
      events.set(key, event);
    } catch {
      // Smaller nested objects and React Flight metadata are not match records.
    }
  }

  return [...events.values()];
}

function decodeNextFlightStream(html) {
  const chunks = [];
  const pattern = /self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)<\/script>/g;
  for (const match of String(html || "").matchAll(pattern)) {
    try {
      chunks.push(JSON.parse(match[1]));
    } catch {
      // Ignore malformed or non-string React Flight chunks.
    }
  }
  return chunks.join("");
}
