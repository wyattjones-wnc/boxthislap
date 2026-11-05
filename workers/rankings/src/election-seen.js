function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

export function normalizeElectionBaseline(body) {
  if (
    !body ||
    !Number.isSafeInteger(body.expectedRevision) ||
    body.expectedRevision < 0 ||
    !Number.isSafeInteger(body.sourceUpdated) ||
    body.sourceUpdated < 0 ||
    body.sourceUpdated > Date.now() + 300000 ||
    !Array.isArray(body.candidates) ||
    body.candidates.length < 1 ||
    body.candidates.length > 100
  ) {
    throw httpError(400, "Invalid election baseline.");
  }
  const ids = new Set();
  for (const candidate of body.candidates) {
    if (
      !candidate ||
      typeof candidate.id !== "string" ||
      !/^[\w-]{1,80}$/.test(candidate.id) ||
      ids.has(candidate.id) ||
      !Number.isSafeInteger(candidate.votes) ||
      candidate.votes < 0 ||
      typeof candidate.first !== "string" ||
      typeof candidate.last !== "string" ||
      candidate.first.length > 100 ||
      candidate.last.length > 100
    ) {
      throw httpError(400, "Invalid election candidate counts.");
    }
    ids.add(candidate.id);
  }
  const total = body.candidates.reduce(
    (sum, candidate) => sum + candidate.votes,
    0,
  );
  if (!Number.isSafeInteger(total))
    throw httpError(400, "Invalid total votes.");
  const leaders = body.candidates
    .filter((c) => !(c.last === "Other" && !c.first))
    .sort((a, b) => b.votes - a.votes);
  return {
    sourceUpdated: body.sourceUpdated,
    votes: Object.fromEntries(
      body.candidates.map((candidate) => [candidate.id, candidate.votes]),
    ),
    total,
    gap: leaders.length >= 2 ? leaders[0].votes - leaders[1].votes : null,
  };
}

export async function handleElectionSeenRequest({
  env,
  readBody,
  readManagerCatalog,
  request,
  requireManager,
  url,
}) {
  const match = url.pathname.match(
    /^\/api\/elections\/2026\/seen(?:\/(AK|MS)\/(\d{1,12}))?$/,
  );
  if (!match) return null;
  if (request.method === "GET" && !match[1]) {
    const { results } = await env.DB.prepare(
      "SELECT state, race_id, baseline_json, revision FROM election_seen WHERE election_year = ?",
    )
      .bind(2026)
      .all();
    return {
      baselines: Object.fromEntries(
        results.map((row) => [
          `${row.state}:${row.race_id}`,
          { ...JSON.parse(row.baseline_json), revision: row.revision },
        ]),
      ),
    };
  }
  if (request.method !== "PUT" || !match[1])
    throw httpError(405, "Method not allowed.");
  const manager = await requireManager(request, env);
  const catalog = await readManagerCatalog(env);
  const entry = catalog.find((item) => String(item.id) === String(manager.sub));
  // Match the existing Workouts admin policy, using the trusted manager catalog.
  const names = [entry?.displayName, entry?.name]
    .filter(Boolean)
    .flatMap((value) => {
      const normalized = String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      return [normalized, normalized.split(/\s+/)[0]];
    });
  if (!names.includes("wyatt"))
    throw httpError(403, "Administrator access is required.");
  const body = await readBody(request);
  const baseline = {
    ...normalizeElectionBaseline(body),
    markedAt: new Date().toISOString(),
  };
  const state = match[1];
  const raceId = match[2];
  // Conditional writes prevent another admin tab or an older source snapshot
  // from silently replacing a newer baseline.
  const result =
    body.expectedRevision === 0
      ? await env.DB.prepare(
          "INSERT OR IGNORE INTO election_seen (election_year, state, race_id, baseline_json, source_updated, revision) VALUES (?, ?, ?, ?, ?, 1)",
        )
          .bind(
            2026,
            state,
            raceId,
            JSON.stringify(baseline),
            baseline.sourceUpdated,
          )
          .run()
      : await env.DB.prepare(
          "UPDATE election_seen SET baseline_json = ?, source_updated = ?, revision = revision + 1 WHERE election_year = ? AND state = ? AND race_id = ? AND revision = ? AND source_updated <= ?",
        )
          .bind(
            JSON.stringify(baseline),
            baseline.sourceUpdated,
            2026,
            state,
            raceId,
            body.expectedRevision,
            baseline.sourceUpdated,
          )
          .run();
  if (result.meta.changes !== 1)
    throw httpError(
      409,
      "The shared baseline changed or these results are older. Refresh and try again.",
    );
  return { baseline: { ...baseline, revision: body.expectedRevision + 1 } };
}
