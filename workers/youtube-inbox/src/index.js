const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const VALID_STATUSES = new Set(["new", "ignored", "saved", "watched"]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = getCorsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors, status: isAllowedOrigin(origin, env) ? 204 : 403 });
    }

    try {
      const url = new URL(request.url);
      if (url.pathname === "/health") {
        return json({ ok: true, service: "box-this-lap-youtube" }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/api/auth/login") {
        return json(await login(request, env), 200, cors);
      }

      await requireAuthorizedSession(request, env);

      if (request.method === "GET" && url.pathname === "/api/session") {
        return json({ authenticated: true }, 200, cors);
      }
      if (request.method === "GET" && url.pathname === "/api/videos") {
        return json(await getVideos(url, env), 200, cors);
      }
      if (request.method === "GET" && url.pathname === "/api/youtube/playlists") {
        return json({ playlists: await getPlaylists(env) }, 200, cors);
      }
      if (request.method === "POST" && url.pathname === "/api/youtube/sync") {
        return json(await syncYouTube(env), 200, cors);
      }

      const statusMatch = url.pathname.match(/^\/api\/videos\/([^/]+)\/status$/);
      if (request.method === "POST" && statusMatch) {
        return json(await updateVideoStatus(decodeURIComponent(statusMatch[1]), request, env), 200, cors);
      }

      const seenThroughMatch = url.pathname.match(/^\/api\/videos\/([^/]+)\/seen-through$/);
      if (request.method === "POST" && seenThroughMatch) {
        return json(await markVideosSeenThrough(decodeURIComponent(seenThroughMatch[1]), env), 200, cors);
      }

      const playlistMatch = url.pathname.match(/^\/api\/youtube\/playlists\/([^/]+)\/videos$/);
      if (request.method === "POST" && playlistMatch) {
        return json(await addVideoToPlaylist(decodeURIComponent(playlistMatch[1]), request, env), 200, cors);
      }

      return json({ error: "Not found." }, 404, cors);
    } catch (error) {
      const status = Number(error.status) || 500;
      if (status >= 500) console.error(error);
      return json({ error: status >= 500 ? "The YouTube inbox service encountered an error." : error.message }, status, cors);
    }
  },
};

async function getVideos(url, env) {
  const status = url.searchParams.get("status") || "new";
  const channel = url.searchParams.get("channel") || "";
  const limit = clampNumber(url.searchParams.get("limit"), 1, 100, 50);
  const offset = clampNumber(url.searchParams.get("offset"), 0, 10000, 0);

  if (status !== "all" && !VALID_STATUSES.has(status)) {
    throw httpError(400, "Invalid video status.");
  }

  const clauses = [];
  const bindings = [];
  if (status !== "all") {
    clauses.push("v.status = ?");
    bindings.push(status);
  }
  if (channel) {
    clauses.push("c.name = ?");
    bindings.push(channel);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await env.DB.prepare(`
    SELECT v.youtube_video_id, v.title, v.published_at, v.thumbnail_url,
      v.duration_seconds, v.status, c.youtube_channel_id, c.name AS channel_name
    FROM videos v
    JOIN channels c ON c.id = v.channel_id
    ${where}
    ORDER BY v.published_at DESC
    LIMIT ? OFFSET ?
  `).bind(...bindings, limit, offset).all();
  const channelResult = await env.DB.prepare(`
    SELECT youtube_channel_id, name FROM channels ORDER BY name COLLATE NOCASE
  `).all();
  const lastSync = await env.DB.prepare("SELECT value FROM settings WHERE key = 'last_sync_at'").first();

  return {
    channels: (channelResult.results || []).map((row) => ({
      name: row.name,
      youtubeChannelId: row.youtube_channel_id,
    })),
    lastSyncAt: lastSync?.value || "",
    videos: (result.results || []).map((row) => ({
      channel: { name: row.channel_name, youtubeChannelId: row.youtube_channel_id },
      durationSeconds: row.duration_seconds,
      publishedAt: row.published_at,
      status: row.status,
      thumbnailUrl: row.thumbnail_url,
      title: row.title,
      youtubeVideoId: row.youtube_video_id,
    })),
  };
}

async function updateVideoStatus(videoId, request, env) {
  const body = await readJson(request);
  if (!VALID_STATUSES.has(body.status)) throw httpError(400, "Invalid video status.");
  const processedAt = body.status === "new" ? null : new Date().toISOString();
  const result = await env.DB.prepare(`
    UPDATE videos SET status = ?, processed_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE youtube_video_id = ?
  `).bind(body.status, processedAt, videoId).run();
  if (!result.meta?.changes) throw httpError(404, "Video not found.");
  return { ok: true, status: body.status, videoId };
}

async function markVideosSeenThrough(videoId, env) {
  const selected = await env.DB.prepare(`
    SELECT published_at FROM videos WHERE youtube_video_id = ?
  `).bind(videoId).first();
  if (!selected) throw httpError(404, "Video not found.");

  const processedAt = new Date().toISOString();
  const result = await env.DB.prepare(`
    UPDATE videos
    SET status = 'watched', processed_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE status = 'new' AND published_at >= ?
  `).bind(processedAt, selected.published_at).run();
  return { ok: true, updated: result.meta?.changes || 0, videoId };
}

async function getPlaylists(env) {
  const refreshRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'playlists_refreshed_at'").first();
  const refreshedAt = Date.parse(refreshRow?.value || "");
  const isStale = !Number.isFinite(refreshedAt) || Date.now() - refreshedAt > 5 * 60 * 1000;
  if (isStale) {
    await refreshPlaylists(env, await getGoogleAccessToken(env));
  }

  let result = await env.DB.prepare(`
    SELECT youtube_playlist_id, name FROM playlists ORDER BY name COLLATE NOCASE
  `).all();
  if (!result.results?.length) {
    await refreshPlaylists(env, await getGoogleAccessToken(env));
    result = await env.DB.prepare(`
      SELECT youtube_playlist_id, name FROM playlists ORDER BY name COLLATE NOCASE
    `).all();
  }
  return (result.results || []).map((row) => ({
    name: row.name,
    youtubePlaylistId: row.youtube_playlist_id,
  }));
}

async function syncYouTube(env) {
  const accessToken = await getGoogleAccessToken(env);
  const batchSize = clampNumber(env.SYNC_CHANNEL_BATCH_SIZE, 1, 25, 20);
  const cursorRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'sync_cursor'").first();
  const requestedStart = Math.max(0, Number.parseInt(cursorRow?.value, 10) || 0);
  let channels;
  if (requestedStart === 0) {
    channels = await refreshSubscriptions(env, accessToken);
    await setSetting(env, "sync_channel_ids", JSON.stringify(channels.map((channel) => channel.youtubeChannelId)));
  } else {
    const snapshotRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'sync_channel_ids'").first();
    channels = await getStoredChannels(env, parseJsonArray(snapshotRow?.value));
  }
  const start = Math.min(requestedStart, Math.max(0, channels.length - 1));
  const batch = channels.slice(start, start + batchSize);
  const discovered = [];

  for (const group of chunk(batch, 5)) {
    const groupResults = await Promise.all(group.map((channel) => syncChannel(channel, env, accessToken)));
    discovered.push(...groupResults.flat());
  }

  await fillVideoDurations(discovered, env, accessToken);
  await refreshPlaylists(env, accessToken);

  const nextCursor = start + batch.length;
  const hasMore = nextCursor < channels.length;
  const now = new Date().toISOString();
  await setSetting(env, "sync_cursor", hasMore ? String(nextCursor) : "0");
  await setSetting(env, "last_sync_at", now);

  return {
    channelsChecked: batch.length,
    hasMore,
    inserted: discovered.length,
    lastSyncAt: now,
    totalChannels: channels.length,
  };
}

async function getStoredChannels(env, channelIds) {
  const result = await env.DB.prepare(`
    SELECT youtube_channel_id, name, uploads_playlist_id
    FROM channels ORDER BY youtube_channel_id
  `).all();
  const channels = (result.results || []).map((row) => ({
    name: row.name,
    uploadsPlaylistId: row.uploads_playlist_id,
    youtubeChannelId: row.youtube_channel_id,
  }));
  if (!channelIds.length) return channels;
  const byId = new Map(channels.map((channel) => [channel.youtubeChannelId, channel]));
  return channelIds.map((id) => byId.get(id)).filter(Boolean);
}

async function refreshSubscriptions(env, accessToken) {
  const subscriptionChannelIds = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({ mine: "true", maxResults: "50", part: "snippet" });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await youtubeRequest(`/subscriptions?${params}`, accessToken);
    subscriptionChannelIds.push(...(data.items || []).map((item) => item.snippet?.resourceId?.channelId).filter(Boolean));
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  const channels = [];
  for (const ids of chunk(subscriptionChannelIds, 50)) {
    const params = new URLSearchParams({ id: ids.join(","), maxResults: "50", part: "snippet,contentDetails" });
    const data = await youtubeRequest(`/channels?${params}`, accessToken);
    for (const item of data.items || []) {
      const channel = {
        name: item.snippet?.title || "Unknown channel",
        uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
        youtubeChannelId: item.id,
      };
      if (!channel.uploadsPlaylistId) continue;
      await env.DB.prepare(`
        INSERT INTO channels (youtube_channel_id, name, uploads_playlist_id)
        VALUES (?, ?, ?)
        ON CONFLICT(youtube_channel_id) DO UPDATE SET
          name = excluded.name,
          uploads_playlist_id = excluded.uploads_playlist_id,
          updated_at = CURRENT_TIMESTAMP
      `).bind(channel.youtubeChannelId, channel.name, channel.uploadsPlaylistId).run();
      channels.push(channel);
    }
  }

  return channels.sort((a, b) => a.youtubeChannelId.localeCompare(b.youtubeChannelId));
}

async function syncChannel(channel, env, accessToken) {
  const stored = await env.DB.prepare(`
    SELECT id, latest_known_video_id FROM channels WHERE youtube_channel_id = ?
  `).bind(channel.youtubeChannelId).first();
  const params = new URLSearchParams({ maxResults: "25", part: "snippet,contentDetails", playlistId: channel.uploadsPlaylistId });
  const data = await youtubeRequest(`/playlistItems?${params}`, accessToken);
  const newestId = data.items?.[0]?.contentDetails?.videoId || null;
  const newItems = [];

  for (const item of data.items || []) {
    const videoId = item.contentDetails?.videoId;
    if (!videoId || videoId === stored?.latest_known_video_id) break;
    const snippet = item.snippet || {};
    if (snippet.title === "Deleted video" || snippet.title === "Private video") continue;
    newItems.push({
      channelId: stored.id,
      publishedAt: snippet.videoPublishedAt || snippet.publishedAt,
      thumbnailUrl: pickThumbnail(snippet.thumbnails),
      title: snippet.title || "Untitled video",
      videoId,
    });
  }

  if (newItems.length) {
    await env.DB.batch(newItems.map((video) => env.DB.prepare(`
      INSERT OR IGNORE INTO videos
        (youtube_video_id, channel_id, title, published_at, thumbnail_url)
      VALUES (?, ?, ?, ?, ?)
    `).bind(video.videoId, video.channelId, video.title, video.publishedAt, video.thumbnailUrl)));
  }

  await env.DB.prepare(`
    UPDATE channels SET latest_known_video_id = COALESCE(?, latest_known_video_id),
      last_checked_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(newestId, new Date().toISOString(), stored.id).run();
  return newItems;
}

async function fillVideoDurations(videos, env, accessToken) {
  for (const group of chunk(videos, 50)) {
    if (!group.length) continue;
    const params = new URLSearchParams({ id: group.map((video) => video.videoId).join(","), part: "contentDetails" });
    const data = await youtubeRequest(`/videos?${params}`, accessToken);
    if (!data.items?.length) continue;
    await env.DB.batch(data.items.map((item) => env.DB.prepare(`
      UPDATE videos SET duration_seconds = ?, updated_at = CURRENT_TIMESTAMP WHERE youtube_video_id = ?
    `).bind(parseIsoDuration(item.contentDetails?.duration), item.id)));
  }
}

async function refreshPlaylists(env, accessToken) {
  const playlists = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({ mine: "true", maxResults: "50", part: "snippet" });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await youtubeRequest(`/playlists?${params}`, accessToken);
    playlists.push(...(data.items || []).map((item) => ({ id: item.id, name: item.snippet?.title || "Untitled playlist" })));
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  const channelData = await youtubeRequest("/channels?mine=true&part=contentDetails", accessToken);
  const watchLaterId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.watchLater;
  if (watchLaterId && !playlists.some((playlist) => playlist.id === watchLaterId)) {
    playlists.push({ id: watchLaterId, name: "Watch Later" });
  }

  if (playlists.length) {
    await env.DB.batch(playlists.map((playlist) => env.DB.prepare(`
      INSERT INTO playlists (youtube_playlist_id, name, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(youtube_playlist_id) DO UPDATE SET name = excluded.name, updated_at = CURRENT_TIMESTAMP
    `).bind(playlist.id, playlist.name)));
  }
  await setSetting(env, "playlists_refreshed_at", new Date().toISOString());
}

async function addVideoToPlaylist(playlistId, request, env) {
  const { videoId } = await readJson(request);
  if (!videoId) throw httpError(400, "A video ID is required.");
  const video = await env.DB.prepare("SELECT id FROM videos WHERE youtube_video_id = ?").bind(videoId).first();
  const playlist = await env.DB.prepare("SELECT id FROM playlists WHERE youtube_playlist_id = ?").bind(playlistId).first();
  if (!video) throw httpError(404, "Video not found.");
  if (!playlist) throw httpError(404, "Playlist not found.");

  await youtubeRequest("/playlistItems?part=snippet", await getGoogleAccessToken(env), {
    body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: "youtube#video", videoId } } }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  await env.DB.prepare(`
    INSERT OR IGNORE INTO video_playlist_actions (video_id, playlist_id) VALUES (?, ?)
  `).bind(video.id, playlist.id).run();
  await env.DB.prepare(`
    UPDATE videos SET status = 'saved', processed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(new Date().toISOString(), video.id).run();
  return { ok: true, playlistId, videoId };
}

async function getGoogleAccessToken(env) {
  for (const key of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"]) {
    if (!env[key]) throw httpError(503, `${key} is not configured.`);
  }
  const response = await fetch(GOOGLE_TOKEN_URL, {
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: env.YOUTUBE_REFRESH_TOKEN,
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw httpError(502, "Google OAuth token refresh failed.");
  return data.access_token;
}

async function youtubeRequest(path, accessToken, options = {}) {
  const response = await fetch(`${YOUTUBE_API}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
  });
  const data = await response.json();
  if (!response.ok) {
    const message = data.error?.message || "YouTube API request failed.";
    throw httpError(response.status >= 500 ? 502 : response.status, message);
  }
  return data;
}

async function login(request, env) {
  requireAuthSecrets(env);
  const { passphrase } = await readJson(request);
  if (!await secretsMatch(String(passphrase || ""), env.INBOX_PASSPHRASE)) {
    throw httpError(401, "Incorrect passphrase.");
  }
  const payload = encodeBase64Url(JSON.stringify({ exp: Date.now() + (30 * 24 * 60 * 60 * 1000) }));
  return { token: `${payload}.${await sign(payload, env.SESSION_SECRET)}` };
}

async function requireAuthorizedSession(request, env) {
  requireAuthSecrets(env);
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !await secretsMatch(signature, await sign(payload, env.SESSION_SECRET))) {
    throw httpError(401, "YouTube inbox login is required.");
  }
  try {
    const claims = JSON.parse(decodeBase64Url(payload));
    if (!Number.isFinite(claims.exp) || claims.exp <= Date.now()) throw new Error("expired");
  } catch {
    throw httpError(401, "The YouTube inbox session has expired.");
  }
}

function requireAuthSecrets(env) {
  if (!env.INBOX_PASSPHRASE || !env.SESSION_SECRET) {
    throw httpError(503, "YouTube inbox authentication is not configured.");
  }
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  return encodeBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function secretsMatch(first, second) {
  const [firstHash, secondHash] = await Promise.all([first, second].map((value) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
  const firstBytes = new Uint8Array(firstHash);
  const secondBytes = new Uint8Array(secondHash);
  if (firstBytes.length !== secondBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < firstBytes.length; index += 1) difference |= firstBytes[index] ^ secondBytes[index];
  return difference === 0;
}

function encodeBase64Url(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function getCorsHeaders(origin, env) {
  const headers = {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
  if (isAllowedOrigin(origin, env)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function isAllowedOrigin(origin, env) {
  return String(env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim()).includes(origin);
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { headers, status });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw httpError(400, "A valid JSON body is required.");
  }
}

async function setSetting(env, key, value) {
  await env.DB.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).bind(key, value).run();
}

function pickThumbnail(thumbnails = {}) {
  return thumbnails.medium?.url || thumbnails.high?.url || thumbnails.default?.url || "";
}

function parseIsoDuration(value = "") {
  const match = value.match(/^P(?:([\d.]+)D)?T?(?:([\d.]+)H)?(?:([\d.]+)M)?(?:([\d.]+)S)?$/);
  if (!match) return null;
  return Math.round((Number(match[1] || 0) * 86400) + (Number(match[2] || 0) * 3600) + (Number(match[3] || 0) * 60) + Number(match[4] || 0));
}

function clampNumber(value, minimum, maximum, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
