const TYPES = new Set(["games", "movies", "tv", "mcu"]);
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const BASE_RATING = 1500;
let catalogCache = null;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: allowedOrigin(origin, env) ? 204 : 403, headers: cors });
    }
    if (origin && !allowedOrigin(origin, env)) return json({ ok: false, error: "Origin is not allowed." }, 403, cors);

    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true, service: "box-this-lap-rankings" }, 200, cors);
      }
      if (request.method === "POST" && url.pathname === "/api/auth/bootstrap") {
        return json(await bootstrapAuth(request, env), 200, cors);
      }
      if (request.method === "POST" && url.pathname === "/api/auth/login") {
        return json(await loginAuth(request, env), 200, cors);
      }
      if (request.method === "POST" && url.pathname === "/api/auth/refresh") {
        return json(await refreshAuth(request, env), 200, cors);
      }
      if (request.method === "POST" && url.pathname === "/api/auth/verify") {
        return json(await verifyAuth(request, env), 200, cors);
      }

      const setMatch = url.pathname.match(/^\/api\/managers\/([^/]+)\/rankings\/([^/]+)$/);
      if (request.method === "GET" && setMatch) {
        const managerId = parseId(setMatch[1], "manager ID");
        const type = parseType(setMatch[2]);
        return json({ ok: true, ...(await readRankingSet(env, managerId, type)) }, 200, cors);
      }

      const itemsMatch = url.pathname.match(/^\/api\/managers\/([^/]+)\/rankings\/([^/]+)\/items(?:\/([^/]+))?$/);
      if (itemsMatch && ["POST", "PATCH"].includes(request.method)) {
        const managerId = parseId(itemsMatch[1], "manager ID");
        const type = parseType(itemsMatch[2]);
        await requireOwner(request, env, managerId);
        if (type === "mcu") throw httpError(403, "The MCU catalog is managed through its published sheet.");
        const body = await readBody(request);
        const result = request.method === "POST"
          ? await addItem(env, managerId, type, body)
          : await updateItem(env, managerId, type, parseId(itemsMatch[3], "item ID"), body);
        return json({ ok: true, ...result }, 200, cors);
      }

      const orderMatch = url.pathname.match(/^\/api\/managers\/([^/]+)\/rankings\/([^/]+)\/order$/);
      if (request.method === "PUT" && orderMatch) {
        const managerId = parseId(orderMatch[1], "manager ID");
        const type = parseType(orderMatch[2]);
        await requireOwner(request, env, managerId);
        return json({ ok: true, ...(await saveOrder(env, managerId, type, await readBody(request))) }, 200, cors);
      }

      const manualFromEloMatch = url.pathname.match(/^\/api\/managers\/([^/]+)\/rankings\/([^/]+)\/manual-from-elo$/);
      if (request.method === "POST" && manualFromEloMatch) {
        const managerId = parseId(manualFromEloMatch[1], "manager ID");
        const type = parseType(manualFromEloMatch[2]);
        await requireOwner(request, env, managerId);
        return json({ ok: true, ...(await saveManualFromElo(env, managerId, type, await readBody(request))) }, 200, cors);
      }

      const choiceMatch = url.pathname.match(/^\/api\/managers\/([^/]+)\/rankings\/([^/]+)\/choices$/);
      if (request.method === "POST" && choiceMatch) {
        const managerId = parseId(choiceMatch[1], "manager ID");
        const type = parseType(choiceMatch[2]);
        await requireOwner(request, env, managerId);
        return json({ ok: true, ...(await saveChoice(env, managerId, type, await readBody(request))) }, 200, cors);
      }

      const exclusionMatch = url.pathname.match(/^\/api\/managers\/([^/]+)\/rankings\/([^/]+)\/exclusions\/([^/]+)$/);
      if (request.method === "PUT" && exclusionMatch) {
        const managerId = parseId(exclusionMatch[1], "manager ID");
        const type = parseType(exclusionMatch[2]);
        const itemId = parseId(exclusionMatch[3], "item ID");
        await requireOwner(request, env, managerId);
        return json({ ok: true, ...(await saveExclusion(env, managerId, type, itemId, await readBody(request))) }, 200, cors);
      }

      const normalizeMatch = url.pathname.match(/^\/api\/managers\/([^/]+)\/rankings\/([^/]+)\/normalize$/);
      if (request.method === "POST" && normalizeMatch) {
        const managerId = parseId(normalizeMatch[1], "manager ID");
        const type = parseType(normalizeMatch[2]);
        await requireOwner(request, env, managerId);
        return json({ ok: true, ...(await normalizeRanking(env, managerId, type, await readBody(request))) }, 200, cors);
      }

      return json({ ok: false, error: "Not found." }, 404, cors);
    } catch (error) {
      const status = Number(error?.status) || 500;
      if (status >= 500) console.error(error);
      return json({ ok: false, error: status >= 500 ? "Ranking data could not be saved." : error.message }, status, cors);
    }
  },
};

async function bootstrapAuth(request, env) {
  const origin = request.headers.get("Origin") || "";
  if (!origin || !String(env.BOOTSTRAP_ORIGINS || "").split(",").map((value) => value.trim()).includes(origin)) {
    throw httpError(403, "Legacy session upgrade is not allowed from this origin.");
  }
  if (Date.now() > Date.parse(env.LEGACY_BOOTSTRAP_CUTOFF || "1970-01-01")) throw httpError(401, "Legacy session upgrade has ended. Sign in again.");
  const body = await readBody(request);
  const managerId = parseId(body.managerId, "manager ID");
  const signedInAt = Date.parse(body.signedInAt || "");
  if (!Number.isFinite(signedInAt) || signedInAt > Date.now() + 60000) throw httpError(401, "Legacy session is invalid.");
  return issueTokens(env, managerId);
}

async function loginAuth(request, env) {
  if (!env.MANAGER_PORTAL_ENDPOINT) throw new Error("Manager login validation is not configured.");
  const body = await readBody(request);
  const managerId = parseId(body.managerId, "manager ID");
  const passphrase = String(body.passphrase || "");
  if (!passphrase.trim()) throw httpError(400, "Passphrase is required.");
  const response = await fetch(env.MANAGER_PORTAL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", managerId, passphrase }),
    redirect: "follow",
  });
  if (!response.ok) throw httpError(502, "Manager login could not be verified.");
  const value = await response.json().catch(() => null);
  if (!value || value.source !== "boxthislap-manager-portal" || !value.ok || String(value.managerId || "") !== managerId) {
    throw httpError(401, value?.error || "Manager login was not accepted.");
  }
  return issueTokens(env, managerId);
}

async function refreshAuth(request, env) {
  const body = await readBody(request);
  const payload = await verifyToken(env, body.refreshToken, "refresh");
  return issueTokens(env, payload.sub);
}

async function verifyAuth(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const payload = await verifyToken(env, token, "access");
  return { ok: true, managerId: String(payload.sub) };
}

async function issueTokens(env, managerId) {
  return {
    accessToken: await signToken(env, { sub: managerId, typ: "access" }, ACCESS_TTL_SECONDS),
    accessExpiresAt: new Date(Date.now() + ACCESS_TTL_SECONDS * 1000).toISOString(),
    refreshToken: await signToken(env, { sub: managerId, typ: "refresh" }, REFRESH_TTL_SECONDS),
    refreshExpiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000).toISOString(),
  };
}

async function requireOwner(request, env, managerId) {
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const payload = await verifyToken(env, token, "access");
  if (String(payload.sub) !== String(managerId)) throw httpError(403, "Managers can only edit their own rankings.");
  return payload;
}

async function readRankingSet(env, managerId, type) {
  const [revisionRow, elo, exclusions, snapshots, seeds, pairCounts] = await Promise.all([
    env.DB.prepare("SELECT revision FROM ranking_revisions WHERE manager_id = ? AND ranking_type = ?").bind(managerId, type).first(),
    env.DB.prepare("SELECT item_id, rating, wins, losses, last_choice_id, updated_at FROM ranking_elo WHERE manager_id = ? AND ranking_type = ?").bind(managerId, type).all(),
    env.DB.prepare("SELECT item_id, excluded, updated_at FROM ranking_exclusions WHERE manager_id = ? AND ranking_type = ?").bind(managerId, type).all(),
    env.DB.prepare("SELECT snapshot_id, created_at, label, reason, source FROM ranking_snapshots WHERE manager_id = ? AND ranking_type = ? ORDER BY created_at DESC").bind(managerId, type).all(),
    env.DB.prepare("SELECT item_id, seed_rank, seed_rating, seeded_at, reason FROM ranking_seeds WHERE manager_id = ? AND ranking_type = ?").bind(managerId, type).all(),
    env.DB.prepare("SELECT item_a_id, item_b_id, COUNT(*) AS comparison_count FROM ranking_choices WHERE manager_id = ? AND ranking_type = ? GROUP BY item_a_id, item_b_id").bind(managerId, type).all(),
  ]);
  const itemsResult = type === "mcu"
    ? await env.DB.prepare("SELECT item_id, manual_rank, updated_at FROM ranking_manual_order WHERE manager_id = ? AND ranking_type = 'mcu' ORDER BY manual_rank").bind(managerId).all()
    : await env.DB.prepare("SELECT item_id, name, manual_rank, archived, created_at, updated_at FROM ranking_items WHERE manager_id = ? AND ranking_type = ? ORDER BY manual_rank").bind(managerId, type).all();
  const snapshotRows = snapshots.results || [];
  let snapshotItems = [];
  if (snapshotRows.length) {
    const placeholders = snapshotRows.map(() => "?").join(",");
    const result = await env.DB.prepare(`SELECT snapshot_id, item_id, item_name, rank, rating, wins, losses, games FROM ranking_snapshot_items WHERE snapshot_id IN (${placeholders}) ORDER BY rank`)
      .bind(...snapshotRows.map((row) => row.snapshot_id)).all();
    snapshotItems = result.results || [];
  }
  return {
    managerId,
    rankingType: type,
    revision: Number(revisionRow?.revision || 0),
    items: (itemsResult.results || []).map(camelItem),
    elo: (elo.results || []).map((row) => ({ itemId: row.item_id, rating: row.rating, wins: row.wins, losses: row.losses, lastChoiceId: row.last_choice_id, updatedAt: row.updated_at })),
    exclusions: (exclusions.results || []).map((row) => ({ itemId: row.item_id, excluded: Boolean(row.excluded), updatedAt: row.updated_at })),
    seeds: (seeds.results || []).map((row) => ({ itemId: row.item_id, seedRank: row.seed_rank, seedRating: row.seed_rating, seededAt: row.seeded_at, reason: row.reason })),
    pairCounts: (pairCounts.results || []).map((row) => ({ itemAId: row.item_a_id, itemBId: row.item_b_id, count: Number(row.comparison_count || 0) })),
    snapshots: snapshotRows.map((row) => ({ id: row.snapshot_id, createdAt: row.created_at, label: row.label, reason: row.reason, source: row.source })),
    snapshotItems: snapshotItems.map((row) => ({ snapshotId: row.snapshot_id, itemId: row.item_id, itemName: row.item_name, rank: row.rank, rating: row.rating, wins: row.wins, losses: row.losses, comparisons: row.games })),
  };
}

function camelItem(row) {
  return {
    id: row.item_id,
    name: row.name || "",
    manualRank: Number(row.manual_rank),
    archived: Boolean(row.archived),
    createdAt: row.created_at || "",
    updatedAt: row.updated_at,
  };
}

async function addItem(env, managerId, type, body) {
  const name = cleanName(body.name);
  await assertRevision(env, managerId, type, body.revision);
  const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM ranking_items WHERE manager_id = ? AND ranking_type = ? AND archived = 0").bind(managerId, type).first();
  const nextCount = Number(count?.count || 0) + 1;
  const rank = clampRank(body.manualRank, nextCount);
  const seedRating = Math.round(BASE_RATING + (((nextCount + 1) / 2) - rank) * 8);
  const itemId = crypto.randomUUID();
  const statements = [
    env.DB.prepare("UPDATE ranking_items SET manual_rank = manual_rank + 1, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND ranking_type = ? AND manual_rank >= ?").bind(managerId, type, rank),
    env.DB.prepare("INSERT INTO ranking_items (manager_id, ranking_type, item_id, name, manual_rank) VALUES (?, ?, ?, ?, ?)").bind(managerId, type, itemId, name, rank),
    env.DB.prepare("INSERT INTO ranking_elo (manager_id, ranking_type, item_id, rating) VALUES (?, ?, ?, ?)").bind(managerId, type, itemId, seedRating),
    env.DB.prepare("INSERT INTO ranking_seeds (manager_id, ranking_type, item_id, seed_rank, seed_rating, reason) VALUES (?, ?, ?, ?, ?, 'Initial rating from manual placement')").bind(managerId, type, itemId, rank, seedRating),
  ];
  await runMutationBatch(env, managerId, type, body.revision, statements);
  return { item: { id: itemId, name, manualRank: rank, archived: false }, revision: Number(body.revision) + 1 };
}

async function updateItem(env, managerId, type, itemId, body) {
  await assertRevision(env, managerId, type, body.revision);
  const existing = await env.DB.prepare("SELECT * FROM ranking_items WHERE manager_id = ? AND ranking_type = ? AND item_id = ?").bind(managerId, type, itemId).first();
  if (!existing) throw httpError(404, "Ranking item was not found.");
  const name = body.name === undefined ? existing.name : cleanName(body.name);
  const archived = body.archived === undefined ? Number(existing.archived) : body.archived ? 1 : 0;
  const statements = [
    env.DB.prepare("UPDATE ranking_items SET name = ?, archived = ?, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND ranking_type = ? AND item_id = ?").bind(name, archived, managerId, type, itemId),
  ];
  let manualRank = Number(existing.manual_rank);
  if (!archived && (body.manualRank !== undefined || Number(existing.archived))) {
    const rows = await env.DB.prepare("SELECT item_id FROM ranking_items WHERE manager_id = ? AND ranking_type = ? AND archived = 0 ORDER BY manual_rank").bind(managerId, type).all();
    const ids = (rows.results || []).map((row) => row.item_id).filter((id) => id !== itemId);
    manualRank = clampRank(body.manualRank === undefined ? existing.manual_rank : body.manualRank, ids.length + 1);
    ids.splice(manualRank - 1, 0, itemId);
    ids.forEach((id, index) => statements.push(env.DB.prepare("UPDATE ranking_items SET manual_rank = ?, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND ranking_type = ? AND item_id = ?").bind(index + 1, managerId, type, id)));
  } else if (archived && !Number(existing.archived)) {
    const rows = await env.DB.prepare("SELECT item_id FROM ranking_items WHERE manager_id = ? AND ranking_type = ? AND archived = 0 AND item_id <> ? ORDER BY manual_rank").bind(managerId, type, itemId).all();
    (rows.results || []).forEach((row, index) => statements.push(env.DB.prepare("UPDATE ranking_items SET manual_rank = ?, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND ranking_type = ? AND item_id = ?").bind(index + 1, managerId, type, row.item_id)));
  }
  await runMutationBatch(env, managerId, type, body.revision, statements);
  return { item: { id: itemId, name, manualRank, archived: Boolean(archived) }, revision: Number(body.revision) + 1 };
}

async function saveOrder(env, managerId, type, body) {
  await assertRevision(env, managerId, type, body.revision);
  const itemIds = uniqueIds(body.itemIds);
  if (!itemIds.length) throw httpError(400, "At least one item is required.");
  await assertRankingItems(env, managerId, type, itemIds, { requireCompleteActiveSet: true });
  const statements = itemIds.map((itemId, index) => type === "mcu"
    ? env.DB.prepare("INSERT INTO ranking_manual_order (manager_id, ranking_type, item_id, manual_rank, updated_at) VALUES (?, 'mcu', ?, ?, CURRENT_TIMESTAMP) ON CONFLICT (manager_id, ranking_type, item_id) DO UPDATE SET manual_rank = excluded.manual_rank, updated_at = excluded.updated_at").bind(managerId, itemId, index + 1)
    : env.DB.prepare("UPDATE ranking_items SET manual_rank = ?, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND ranking_type = ? AND item_id = ? AND archived = 0").bind(index + 1, managerId, type, itemId));
  await runMutationBatch(env, managerId, type, body.revision, statements);
  return { revision: Number(body.revision) + 1 };
}

async function saveManualFromElo(env, managerId, type, body) {
  await assertRevision(env, managerId, type, body.revision);
  const currentManualItemIds = uniqueIds(body.currentManualItemIds);
  const itemIds = uniqueIds(body.itemIds);
  if (!currentManualItemIds.length || !itemIds.length) throw httpError(400, "Current Manual and Elo orders are required.");
  await assertRankingItems(env, managerId, type, currentManualItemIds, { requireCompleteActiveSet: true });
  await assertRankingItems(env, managerId, type, itemIds, { requireCompleteActiveSet: true });

  const itemNames = await readRankingItemNames(env, managerId, type);
  const snapshotId = crypto.randomUUID();
  const statements = [
    env.DB.prepare("INSERT INTO ranking_snapshots (snapshot_id, manager_id, ranking_type, label, reason, source) VALUES (?, ?, ?, ?, 'Saved before replacing Manual Rank with Elo order', 'manual')")
      .bind(snapshotId, managerId, type, String(body.label || "")),
  ];

  for (let index = 0; index < currentManualItemIds.length; index += 1) {
    const itemId = currentManualItemIds[index];
    const current = await readElo(env, managerId, type, itemId);
    statements.push(env.DB.prepare("INSERT INTO ranking_snapshot_items (snapshot_id, item_id, item_name, rank, rating, wins, losses, games) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(snapshotId, itemId, itemNames.get(itemId) || "", index + 1, current.rating, current.wins, current.losses, current.wins + current.losses));
  }

  itemIds.forEach((itemId, index) => statements.push(type === "mcu"
    ? env.DB.prepare("INSERT INTO ranking_manual_order (manager_id, ranking_type, item_id, manual_rank, updated_at) VALUES (?, 'mcu', ?, ?, CURRENT_TIMESTAMP) ON CONFLICT (manager_id, ranking_type, item_id) DO UPDATE SET manual_rank = excluded.manual_rank, updated_at = excluded.updated_at").bind(managerId, itemId, index + 1)
    : env.DB.prepare("UPDATE ranking_items SET manual_rank = ?, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND ranking_type = ? AND item_id = ? AND archived = 0").bind(index + 1, managerId, type, itemId)));

  await runMutationBatch(env, managerId, type, body.revision, statements);
  return { snapshotId, revision: Number(body.revision) + 1 };
}

async function saveChoice(env, managerId, type, body) {
  await assertRevision(env, managerId, type, body.revision);
  const winnerId = parseId(body.winnerId, "winner ID");
  const loserId = parseId(body.loserId, "loser ID");
  if (winnerId === loserId) throw httpError(400, "Winner and loser must be different.");
  await assertRankingItems(env, managerId, type, [winnerId, loserId]);
  const [winner, loser] = await Promise.all([readElo(env, managerId, type, winnerId), readElo(env, managerId, type, loserId)]);
  const winnerK = winner.wins + winner.losses < 10 ? 64 : 32;
  const loserK = loser.wins + loser.losses < 10 ? 64 : 32;
  const expectedWinner = expected(winner.rating, loser.rating);
  const expectedLoser = expected(loser.rating, winner.rating);
  winner.rating = Math.round(winner.rating + winnerK * (1 - expectedWinner)); winner.wins += 1;
  loser.rating = Math.round(loser.rating + loserK * (0 - expectedLoser)); loser.losses += 1;
  const choiceId = crypto.randomUUID();
  await runMutationBatch(env, managerId, type, body.revision, [
    env.DB.prepare("INSERT INTO ranking_choices (choice_id, manager_id, ranking_type, item_a_id, item_b_id, winner_id, loser_id) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(choiceId, managerId, type, winnerId, loserId, winnerId, loserId),
    eloStatement(env, managerId, type, winnerId, winner, choiceId),
    eloStatement(env, managerId, type, loserId, loser, choiceId),
  ]);
  return { choiceId, revision: Number(body.revision) + 1, elo: [{ itemId: winnerId, ...winner }, { itemId: loserId, ...loser }] };
}

async function saveExclusion(env, managerId, type, itemId, body) {
  await assertRevision(env, managerId, type, body.revision);
  await assertRankingItems(env, managerId, type, [itemId]);
  const excluded = body.excluded ? 1 : 0;
  await runMutationBatch(env, managerId, type, body.revision, [
    env.DB.prepare("INSERT INTO ranking_exclusions (manager_id, ranking_type, item_id, excluded, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT (manager_id, ranking_type, item_id) DO UPDATE SET excluded = excluded.excluded, updated_at = excluded.updated_at").bind(managerId, type, itemId, excluded),
  ]);
  return { itemId, excluded: Boolean(excluded), revision: Number(body.revision) + 1 };
}

async function normalizeRanking(env, managerId, type, body) {
  await assertRevision(env, managerId, type, body.revision);
  const itemIds = uniqueIds(body.itemIds);
  if (!itemIds.length) throw httpError(400, "At least one item is required.");
  await assertRankingItems(env, managerId, type, itemIds, { requireCompleteActiveSet: true });
  const itemNames = await readRankingItemNames(env, managerId, type);
  const snapshotId = crypto.randomUUID();
  const midpoint = (itemIds.length + 1) / 2;
  const statements = [env.DB.prepare("INSERT INTO ranking_snapshots (snapshot_id, manager_id, ranking_type, label, reason, source) VALUES (?, ?, ?, ?, ?, 'calculated')").bind(snapshotId, managerId, type, String(body.label || ""), String(body.reason || "Normalized calculated rankings"))];
  for (let index = 0; index < itemIds.length; index += 1) {
    const itemId = itemIds[index];
    const current = await readElo(env, managerId, type, itemId);
    statements.push(env.DB.prepare("INSERT INTO ranking_snapshot_items (snapshot_id, item_id, item_name, rank, rating, wins, losses, games) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(snapshotId, itemId, itemNames.get(itemId) || "", index + 1, current.rating, current.wins, current.losses, current.wins + current.losses));
    statements.push(eloStatement(env, managerId, type, itemId, { rating: Math.round(BASE_RATING + (midpoint - (index + 1)) * 8), wins: 0, losses: 0 }, ""));
  }
  statements.push(env.DB.prepare("DELETE FROM ranking_choices WHERE manager_id = ? AND ranking_type = ?").bind(managerId, type));
  await runMutationBatch(env, managerId, type, body.revision, statements);
  return { snapshotId, revision: Number(body.revision) + 1 };
}

async function readElo(env, managerId, type, itemId) {
  const row = await env.DB.prepare("SELECT rating, wins, losses FROM ranking_elo WHERE manager_id = ? AND ranking_type = ? AND item_id = ?").bind(managerId, type, itemId).first();
  return { rating: Number(row?.rating || BASE_RATING), wins: Number(row?.wins || 0), losses: Number(row?.losses || 0) };
}

function eloStatement(env, managerId, type, itemId, row, choiceId) {
  return env.DB.prepare("INSERT INTO ranking_elo (manager_id, ranking_type, item_id, rating, wins, losses, last_choice_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT (manager_id, ranking_type, item_id) DO UPDATE SET rating = excluded.rating, wins = excluded.wins, losses = excluded.losses, last_choice_id = excluded.last_choice_id, updated_at = excluded.updated_at")
    .bind(managerId, type, itemId, row.rating, row.wins, row.losses, choiceId);
}

async function assertRevision(env, managerId, type, submitted) {
  const row = await env.DB.prepare("SELECT revision FROM ranking_revisions WHERE manager_id = ? AND ranking_type = ?").bind(managerId, type).first();
  const current = Number(row?.revision || 0);
  if (!Number.isInteger(Number(submitted)) || Number(submitted) !== current) throw httpError(409, "Ranking changed in another session. Reload and try again.");
}

async function assertRankingItems(env, managerId, type, itemIds, options = {}) {
  if (type === "mcu") {
    const catalogIds = new Set((await readCatalog(env)).keys());
    if (itemIds.some((itemId) => !catalogIds.has(String(itemId)))) throw httpError(400, "Ranking contains an item that is not in the published MCU catalog.");
    if (options.requireCompleteActiveSet && (itemIds.length !== catalogIds.size || [...catalogIds].some((itemId) => !itemIds.includes(itemId)))) {
      throw httpError(400, "MCU ranking order must include every published item exactly once.");
    }
    return;
  }
  const rows = await env.DB.prepare("SELECT item_id FROM ranking_items WHERE manager_id = ? AND ranking_type = ? AND archived = 0 ORDER BY item_id").bind(managerId, type).all();
  const activeIds = (rows.results || []).map((row) => String(row.item_id));
  const activeSet = new Set(activeIds);
  if (itemIds.some((itemId) => !activeSet.has(String(itemId)))) throw httpError(400, "Ranking contains an item that is not in this manager's active set.");
  if (options.requireCompleteActiveSet && (itemIds.length !== activeIds.length || activeIds.some((itemId) => !itemIds.includes(itemId)))) {
    throw httpError(400, "Ranking order must include every active item exactly once.");
  }
}

async function readRankingItemNames(env, managerId, type) {
  if (type === "mcu") return readCatalog(env);
  const rows = await env.DB.prepare("SELECT item_id, name FROM ranking_items WHERE manager_id = ? AND ranking_type = ?").bind(managerId, type).all();
  return new Map((rows.results || []).map((row) => [String(row.item_id), String(row.name || "")]));
}

async function readCatalog(env) {
  if (catalogCache?.expiresAt > Date.now()) return catalogCache.items;
  if (!env.CATALOG_URL) throw new Error("MCU catalog validation is not configured.");
  const response = await fetch(env.CATALOG_URL, { cf: { cacheEverything: true, cacheTtl: 300 } });
  if (!response.ok) throw new Error("The published MCU catalog could not be validated.");
  const value = await response.json();
  if (value?.schemaVersion !== 1 || !Array.isArray(value.items) || !value.items.length) throw new Error("The published MCU catalog is invalid.");
  const items = new Map(value.items.map((item) => [parseId(item.id, "MCU item ID"), cleanName(item.name)]));
  if (items.size !== value.items.length) throw new Error("The published MCU catalog contains duplicate IDs.");
  catalogCache = { items, expiresAt: Date.now() + 5 * 60 * 1000 };
  return items;
}

async function runMutationBatch(env, managerId, type, revision, statements) {
  const guarded = [
    env.DB.prepare("INSERT INTO ranking_revision_claims (manager_id, ranking_type, revision) VALUES (?, ?, ?)").bind(managerId, type, Number(revision)),
    ...statements,
    revisionStatement(env, managerId, type),
  ];
  try {
    await env.DB.batch(guarded);
  } catch (error) {
    if (/ranking_revision_claims|UNIQUE constraint failed/i.test(String(error?.message || error))) {
      throw httpError(409, "Ranking changed in another session. Reload and try again.");
    }
    throw error;
  }
}

function revisionStatement(env, managerId, type) {
  return env.DB.prepare("INSERT INTO ranking_revisions (manager_id, ranking_type, revision, updated_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP) ON CONFLICT (manager_id, ranking_type) DO UPDATE SET revision = ranking_revisions.revision + 1, updated_at = CURRENT_TIMESTAMP").bind(managerId, type);
}

async function signToken(env, claims, ttl) {
  if (!env.AUTH_SECRET) throw new Error("Ranking authorization is not configured.");
  const now = Math.floor(Date.now() / 1000);
  const encoded = base64Url(JSON.stringify({ ...claims, iat: now, exp: now + ttl, v: 1 }));
  return `${encoded}.${await signature(env.AUTH_SECRET, encoded)}`;
}

async function verifyToken(env, token, type) {
  const [encoded, provided] = String(token || "").split(".");
  if (!encoded || !provided || provided !== await signature(env.AUTH_SECRET, encoded)) throw httpError(401, "Manager authorization is invalid.");
  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded))); } catch { throw httpError(401, "Manager authorization is invalid."); }
  if (payload.typ !== type || !payload.sub || Number(payload.exp || 0) <= Math.floor(Date.now() / 1000)) throw httpError(401, "Manager authorization has expired.");
  return payload;
}

async function signature(secret, value) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return encodeBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

function base64Url(value) { return encodeBase64Url(new TextEncoder().encode(value)); }
function encodeBase64Url(bytes) { let binary = ""; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function decodeBase64Url(value) { const normalized = value.replace(/-/g, "+").replace(/_/g, "/"); const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4); return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)); }

function parseType(value) { const type = parseId(value, "ranking type").toLowerCase(); if (!TYPES.has(type)) throw httpError(400, "Invalid ranking type."); return type; }
function parseId(value, label) { let decoded; try { decoded = decodeURIComponent(String(value || "")).trim(); } catch { throw httpError(400, `Invalid ${label}.`); } if (!decoded || decoded.length > 160 || /[\/\u0000-\u001F\u007F]/.test(decoded)) throw httpError(400, `Invalid ${label}.`); return decoded; }
function cleanName(value) { const name = String(value || "").trim(); if (!name || name.length > 180) throw httpError(400, "Item name is required and must be 180 characters or fewer."); return name; }
function uniqueIds(values) { if (!Array.isArray(values)) return []; return [...new Set(values.map((value) => parseId(value, "item ID")))]; }
function clampRank(value, max) { const rank = Number(value); return Number.isInteger(rank) ? Math.min(Math.max(rank, 1), Math.max(max, 1)) : Math.max(max, 1); }
function expected(rating, opponent) { return 1 / (1 + 10 ** ((opponent - rating) / 400)); }
async function readBody(request) { try { return await request.json(); } catch { throw httpError(400, "Request body must be valid JSON."); } }
function allowedOrigin(origin, env) { return !origin || String(env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).includes(origin); }
function corsHeaders(origin, env) { const headers = { "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, OPTIONS", "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8", Vary: "Origin" }; if (origin && allowedOrigin(origin, env)) headers["Access-Control-Allow-Origin"] = origin; return headers; }
function json(data, status, headers) { return new Response(JSON.stringify(data), { status, headers }); }
function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
