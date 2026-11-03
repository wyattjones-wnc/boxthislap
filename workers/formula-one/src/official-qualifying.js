// Read the rendered results table, not the embedded Next.js implementation data.
function cells(row) {
  return [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) =>
    match[1]
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;|&#160;/g, " ")
      .trim(),
  );
}

function rows(html) {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(
    (match) => match[1],
  );
}

export function findOfficialQualifyingPath(html, year, raceDate) {
  const date = new Date(`${raceDate}T12:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() !== Number(year)
  )
    throw new Error("Invalid race date for official qualifying results.");
  const label = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
  const matches = rows(html).filter((row) => cells(row)[1] === label);
  if (matches.length !== 1)
    throw new Error(
      "Official qualifying round could not be identified by race date.",
    );
  const path = matches[0].match(
    /href="(\/en\/results\/\d{4}\/races\/\d+\/[a-z0-9-]+\/)race-result"/i,
  )?.[1];
  if (!path || !path.startsWith(`/en/results/${year}/`))
    throw new Error("Official qualifying results link is unavailable.");
  return `${path}qualifying`;
}

export function applyOfficialQualifying(results, html, sourceUrl) {
  const classifications = new Map();
  for (const row of rows(html)) {
    const values = cells(row);
    if (values.length !== 8) continue;
    const [classification, number, , , q1, q2, q3, laps] = values;
    if (
      !/^\d+$/.test(number) ||
      !/^(?:[1-9]\d*|DQ|DSQ|DNS|DNQ|NC)$/.test(classification)
    )
      throw new Error("Unrecognized official qualifying classification.");
    if (classifications.has(number))
      throw new Error("Duplicate official qualifying driver number.");
    classifications.set(number, { classification, q1, q2, q3, laps });
  }
  if (
    classifications.size !== results.length ||
    !results.every((result) =>
      classifications.has(String(result.permanentNumber)),
    )
  )
    throw new Error(
      "Official qualifying results do not match the provider roster.",
    );
  return results.map((result) => {
    const official = classifications.get(String(result.permanentNumber));
    const disqualified = /^(DQ|DSQ)$/.test(official.classification);
    return {
      ...result,
      position: /^\d+$/.test(official.classification)
        ? Number(official.classification)
        : null,
      classifiedPosition: disqualified ? "DSQ" : official.classification,
      status: disqualified
        ? "Disqualified"
        : official.classification === "DNS"
          ? "Did not start"
          : "",
      q1: official.q1,
      q2: official.q2,
      q3: official.q3,
      laps: /^\d+$/.test(official.laps) ? Number(official.laps) : null,
      rawJson: JSON.stringify({
        provider: JSON.parse(result.rawJson),
        official: { ...official, sourceUrl },
      }),
    };
  });
}

export async function fetchOfficialQualifying(results, year, raceDate) {
  const base = "https://www.formula1.com";
  async function read(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok)
      throw new Error(
        `Official qualifying provider returned HTTP ${response.status}.`,
      );
    return response.text();
  }
  const index = await read(`${base}/en/results/${year}/races`);
  const sourceUrl = `${base}${findOfficialQualifyingPath(index, year, raceDate)}`;
  return {
    results: applyOfficialQualifying(results, await read(sourceUrl), sourceUrl),
    sourceUrl,
  };
}
