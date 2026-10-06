// Public season facts only: no manager entries or provisional bet scoring.
export function buildFormulaOneProgress({
  drivers = [],
  rounds = [],
  results = [],
} = {}) {
  const names = new Map(
    drivers.map((driver) => [driver.driver_id, driver.display_name]),
  );
  const teams = new Map(
    drivers.map((driver) => [driver.driver_id, driver.constructor_name]),
  );
  const normalizeName = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  const awardName = (value) => {
    if (names.has(value)) return names.get(value);
    const normalized = normalizeName(value);
    if (!normalized) return "";
    const matches = drivers.filter((driver) => {
      const aliases = [
        driver.display_name,
        `${driver.given_name || ""} ${driver.family_name || ""}`,
      ].map(normalizeName);
      return aliases.some(
        (alias) =>
          alias === normalized ||
          (normalized.includes(" ") && alias.endsWith(` ${normalized}`)),
      );
    });
    return matches.length === 1
      ? matches[0].display_name
      : String(value).trim();
  };
  const counts = {};
  const add = (metric, name, value) => {
    if (!name) return;
    counts[metric] ??= {};
    counts[metric][name] = (counts[metric][name] || 0) + value;
  };
  const raceRounds = new Set();
  for (const result of results) {
    const name = names.get(result.driver_id) || result.driver_id;
    const position = Number(result.position);
    if (["race", "sprint"].includes(result.session_type)) {
      add("driverPoints", name, Number(result.points) || 0);
      add(
        "constructorPoints",
        result.constructor_name || teams.get(result.driver_id),
        Number(result.points) || 0,
      );
    }
    if (result.session_type === "race") {
      raceRounds.add(Number(result.round));
      if (position >= 1 && position <= 3) add("podiums", name, 1);
      if (
        result.laps !== null &&
        result.laps !== undefined &&
        result.laps !== ""
      )
        add("laps", name, Number(result.laps) || 0);
    }
    if (result.session_type === "qualifying" && position === 1)
      add("poles", name, 1);
    if (result.session_type === "sprint")
      add("sprintPoints", name, Number(result.points) || 0);
  }
  for (const round of rounds) {
    if (!raceRounds.has(Number(round.round))) continue;
    add("driverOfTheDay", awardName(round.driver_of_the_day), 1);
  }
  return { counts, completedRounds: raceRounds.size };
}

export function getFormulaOneQuestionProgress(questionText, progress) {
  const text = String(questionText || "");
  const rules = [
    [/finish on the podium/i, "podiums", "Podiums so far", "podiums", "all"],
    [
      /driver of the day/i,
      "driverOfTheDay",
      "Driver of the Day awards so far",
      "awards",
      "all",
    ],
    [
      /last in the drivers championship/i,
      "driverPoints",
      "Currently last in points",
      "points",
      "last",
    ],
    [
      /last in the world constructors championship/i,
      "constructorPoints",
      "Currently last in constructor points",
      "points",
      "last",
    ],
    [
      /world drivers champion|driver'?s champion/i,
      "driverPoints",
      "Current points leader",
      "points",
      "leader",
    ],
    [
      /world constructors champion|constructor'?s champion/i,
      "constructorPoints",
      "Current constructor points leader",
      "points",
      "leader",
    ],
    [
      /final championship order/i,
      "driverPoints",
      "Current championship order",
      "points",
      "all",
    ],
    [
      /sprint race champion/i,
      "sprintPoints",
      "Current sprint points leader",
      "points",
      "leader",
    ],
    [
      /most.*pole(?: position)?s?/i,
      "poles",
      "Pole positions so far",
      "poles",
      "all",
    ],
    [
      /fewest racing laps/i,
      "laps",
      "Racing laps completed so far",
      "laps",
      "all",
    ],
  ];
  const rule = rules.find(([pattern]) => pattern.test(text));
  if (!rule) return null;
  const [, metric, label, unit, mode] = rule;
  let entries = Object.entries(progress?.counts?.[metric] || {}).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  if (!entries.length) return null;
  if (mode !== "all") {
    const target = mode === "last" ? entries.at(-1)[1] : entries[0][1];
    entries = entries.filter(([, value]) => value === target);
  }
  return { label, unit, entries };
}
