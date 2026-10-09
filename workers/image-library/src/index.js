import {
  mediaBudget,
  reserveMedia,
  releaseMediaStorage,
} from "../../shared/media-budget.js";
import { imageInfo } from "./image-info.js";
export { MediaBudget } from "./budget.js";
const KINDS = new Set(["movies", "games", "tv", "footy"]);
export const normalizeTitle = (value) =>
  String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
const kind = (value) => (value === "mcu" ? "movies" : value);
const fail = (status, message) => Object.assign(new Error(message), { status });
const text = (value, max = 200) => {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw fail(400, "Invalid text field.");
  return value.trim();
};
function contentInput(input) {
  const k = kind(input.kind);
  if (!KINDS.has(k)) throw fail(400, "Choose movies, games, TV, or Footy.");
  const title = text(input.title),
    year = String(input.year || "");
  if (year && !/^\d{4}$/.test(year))
    throw fail(400, "Year must have four digits.");
  const aliases = [
    title,
    ...(Array.isArray(input.aliases) ? input.aliases : []),
  ].map((a) => normalizeTitle(text(a)));
  if (aliases.length > 21)
    throw fail(400, "Use up to twenty alternate titles.");
  return { kind: k, title, year, aliases: [...new Set(aliases)] };
}
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url),
      origin = request.headers.get("Origin") || "";
    const allowed = String(env.ALLOWED_ORIGINS || "")
      .split(",")
      .includes(origin);
    const headers = {
      "Access-Control-Allow-Origin": allowed ? origin : "",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
      "Access-Control-Expose-Headers": "ETag,Content-Length",
      Vary: "Origin",
      "Cache-Control": "no-store",
    };
    const json = (value, status = 200) =>
      Response.json(value, { status, headers });
    if (origin && !allowed)
      return json({ error: "Origin is not allowed." }, 403);
    if (request.method === "OPTIONS")
      return new Response(null, { status: allowed ? 204 : 403, headers });
    try {
      if (url.pathname === "/health")
        return json({ ok: true, service: "image-library" });
      if (
        request.method === "GET" &&
        /^\/media\/library\/[a-f0-9-]+\.(png|jpg|webp)$/.test(url.pathname)
      ) {
        const cacheKey = new Request(`${url.origin}${url.pathname}`),
          cache = typeof caches === "undefined" ? null : caches.default;
        const cached = await cache?.match(cacheKey);
        if (cached) return withCors(cached, headers);
        await reserveMedia(env, "read");
        const object = await env.IMAGES.get(
          url.pathname.slice("/media/library/".length),
        );
        if (!object) return json({ error: "Image not found." }, 404);
        const h = new Headers({
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Type":
            object.httpMetadata?.contentType || "application/octet-stream",
          ETag: object.httpEtag,
          "Content-Length": String(object.size),
        });
        const response = new Response(object.body, { headers: h });
        if (cache) ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return withCors(response, headers);
      }
      const manager = await authenticate(request, env);
      const admin = String(env.ADMIN_MANAGER_IDS || "")
        .split(",")
        .map((s) => s.trim())
        .includes(manager);
      const read = request.method === "GET",
        resolve =
          url.pathname === "/api/images/resolve" && request.method === "POST",
        link =
          url.pathname === "/api/images/link" &&
          ["PUT", "DELETE"].includes(request.method);
      if (!admin && !read && !resolve && !link)
        throw fail(403, "Only admins can manage images.");
      if (url.pathname === "/api/images/budget") {
        if (!admin) throw fail(403, "Only admins can inspect image budgets.");
        if (!["GET", "PUT"].includes(request.method))
          throw fail(405, "Method not allowed.");
        return json(
          await mediaBudget(
            env,
            request.method === "PUT" ? "/configure" : "/status",
            request.method,
            request.method === "PUT" ? await body(request) : undefined,
          ),
        );
      }
      if (url.pathname === "/api/images/presets") {
        if (read)
          return json({
            presets: (
              await env.DB.prepare(
                "SELECT * FROM image_presets ORDER BY context, name",
              ).all()
            ).results,
          });
        if (request.method !== "PUT") throw fail(405, "Method not allowed.");
        const input = await body(request),
          id = input.id || crypto.randomUUID();
        const context = text(input.context, 30);
        if (
          ![
            "movies",
            "games",
            "tv",
            "mcu",
            "footy-card",
            "footy-profile",
            "standalone",
          ].includes(context)
        )
          throw fail(400, "Invalid preset context.");
        const name = text(input.name, 80),
          width = Number(input.width),
          height = Number(input.height);
        if (
          !Number.isInteger(width) ||
          !Number.isInteger(height) ||
          width < 1 ||
          height < 1 ||
          width > 8192 ||
          height > 8192 ||
          width * height > 16_000_000
        )
          throw fail(400, "Preset dimensions exceed the image limit.");
        const previous = await env.DB.prepare(
          "SELECT * FROM image_presets WHERE id = ?",
        )
          .bind(id)
          .first();
        if (previous && input.version !== previous.version)
          throw fail(409, "Preset changed. Reload before saving.");
        const result = previous
          ? await env.DB.prepare(
              "UPDATE image_presets SET name=?,context=?,width=?,height=?,is_default=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?",
            )
              .bind(
                name,
                context,
                width,
                height,
                input.is_default ? 1 : 0,
                id,
                input.version,
              )
              .run()
          : await env.DB.prepare(
              "INSERT INTO image_presets (id,name,context,width,height,is_default) VALUES (?,?,?,?,?,?)",
            )
              .bind(id, name, context, width, height, input.is_default ? 1 : 0)
              .run();
        if (!result.meta.changes)
          throw fail(409, "Preset changed. Reload before saving.");
        return json({
          ok: true,
          preset: await env.DB.prepare("SELECT * FROM image_presets WHERE id=?")
            .bind(id)
            .first(),
        });
      }
      const presetRoute = url.pathname.match(
        /^\/api\/images\/presets\/([^/]+)$/,
      );
      if (presetRoute && request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM image_presets WHERE id=?")
          .bind(presetRoute[1])
          .run();
        return json({ ok: true });
      }
      if (url.pathname === "/api/images/catalog" && read) {
        const q = normalizeTitle(url.searchParams.get("q") || "");
        const query = q
          ? "SELECT DISTINCT c.* FROM image_content c JOIN image_title_aliases a ON a.content_id=c.id WHERE a.normalized_title >= ? AND a.normalized_title < ? ORDER BY c.title,c.year LIMIT 48"
          : "SELECT * FROM image_content ORDER BY created_at DESC LIMIT 48";
        const content = (
          await (
            q
              ? env.DB.prepare(query).bind(q, `${q}\uffff`)
              : env.DB.prepare(query)
          ).all()
        ).results;
        return json({
          content,
          files: await filesFor(
            env,
            content.map((c) => c.id),
          ),
        });
      }
      if (url.pathname === "/api/images/content" && request.method === "POST") {
        const input = await body(request),
          c = contentInput(input),
          id = crypto.randomUUID();
        const external = input.externalKey
          ? text(input.externalKey, 100)
          : null;
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO image_content(id,kind,title,year,external_key,created_by) VALUES(?,?,?,?,?,?)",
          ).bind(id, c.kind, c.title, c.year, external, manager),
          ...c.aliases.map((a) =>
            env.DB.prepare(
              "INSERT INTO image_title_aliases(kind,normalized_title,content_id) VALUES(?,?,?)",
            ).bind(c.kind, a, id),
          ),
        ]);
        return json({ content: { id, ...c, external_key: external } }, 201);
      }
      const contentRoute = url.pathname.match(
        /^\/api\/images\/content\/([^/]+)$/,
      );
      if (contentRoute && read) {
        const content = await env.DB.prepare(
          "SELECT * FROM image_content WHERE id=?",
        )
          .bind(contentRoute[1])
          .first();
        if (!content) throw fail(404, "Content not found.");
        const aliases = (
          await env.DB.prepare(
            "SELECT normalized_title FROM image_title_aliases WHERE content_id=?",
          )
            .bind(content.id)
            .all()
        ).results.map((a) => a.normalized_title);
        return json({
          content,
          aliases,
          files: await filesFor(env, [content.id]),
        });
      }
      if (contentRoute && request.method === "PUT") {
        const c = contentInput(await body(request)),
          id = contentRoute[1];
        const previous = await env.DB.prepare(
          "SELECT kind FROM image_content WHERE id=?",
        )
          .bind(id)
          .first();
        if (previous && previous.kind !== c.kind)
          throw fail(
            409,
            "The content type is fixed after creation. Create a separate record for another type.",
          );
        if (
          !(await env.DB.prepare("SELECT id FROM image_content WHERE id=?")
            .bind(id)
            .first())
        )
          throw fail(404, "Content not found.");
        await env.DB.batch([
          env.DB.prepare(
            "UPDATE image_content SET kind=?,title=?,year=? WHERE id=?",
          ).bind(c.kind, c.title, c.year, id),
          env.DB.prepare(
            "DELETE FROM image_title_aliases WHERE content_id=?",
          ).bind(id),
          ...c.aliases.map((a) =>
            env.DB.prepare(
              "INSERT INTO image_title_aliases(kind,normalized_title,content_id) VALUES(?,?,?)",
            ).bind(c.kind, a, id),
          ),
        ]);
        return json({ ok: true });
      }
      if (resolve) {
        const input = await body(request);
        if (!Array.isArray(input.items) || input.items.length > 40)
          throw fail(400, "Resolve up to forty items at a time.");
        const items = input.items.map((i) => ({
          id: text(String(i.id), 100),
          kind: text(i.kind, 20),
          title: text(i.title),
          normalized: normalizeTitle(i.title),
        }));
        if (
          items.some((i) => !["movies", "mcu", "games", "tv"].includes(i.kind))
        )
          throw fail(400, "Invalid ranking type.");
        if (!items.length) return json({ matches: [] });
        const names = [...new Set(items.map((i) => i.normalized))],
          keys = [
            ...new Set(
              items.filter((i) => i.kind === "mcu").map((i) => `mcu:${i.id}`),
            ),
          ];
        const content = (
          await env.DB.prepare(
            `SELECT DISTINCT c.*, a.normalized_title FROM image_content c LEFT JOIN image_title_aliases a ON a.content_id=c.id WHERE a.normalized_title IN (${names.map(() => "?").join(",")}) ${keys.length ? `OR c.external_key IN (${keys.map(() => "?").join(",")})` : ""}`,
          )
            .bind(...names, ...keys)
            .all()
        ).results;
        const links = (
          await env.DB.prepare(
            `SELECT l.*, c.title, c.year, c.kind AS content_kind FROM image_manager_links l JOIN image_content c ON c.id=l.content_id WHERE l.manager_id=? AND l.item_id IN (${items.map(() => "?").join(",")})`,
          )
            .bind(manager, ...items.map((i) => i.id))
            .all()
        ).results;
        const ids = [
            ...new Set([
              ...content.map((c) => c.id),
              ...links.map((l) => l.content_id),
            ]),
          ],
          files = await filesFor(env, ids);
        const matches = items.map((i) => {
          const linked = links.find(
            (l) => l.kind === i.kind && l.item_id === i.id,
          );
          const candidates = linked
            ? [
                {
                  id: linked.content_id,
                  title: linked.title,
                  year: linked.year,
                },
              ]
            : [
                ...new Map(
                  content
                    .filter(
                      (c) =>
                        c.kind === kind(i.kind) &&
                        (c.normalized_title === i.normalized ||
                          (c.external_key === `mcu:${i.id}` &&
                            i.kind === "mcu")),
                    )
                    .map((c) => [c.id, c]),
                ).values(),
              ];
          return {
            id: i.id,
            kind: i.kind,
            candidates,
            linked: Boolean(linked),
            files:
              candidates.length === 1
                ? files.filter((f) => f.content_id === candidates[0].id)
                : [],
          };
        });
        return json({ matches });
      }
      if (link) {
        const i = await body(request),
          k = text(i.kind, 20),
          id = text(String(i.itemId), 100);
        if (!["mcu", "movies", "games", "tv"].includes(k))
          throw fail(400, "Invalid ranking type.");
        if (request.method === "DELETE")
          await env.DB.prepare(
            "DELETE FROM image_manager_links WHERE manager_id=? AND kind=? AND item_id=?",
          )
            .bind(manager, k, id)
            .run();
        else {
          const content = await env.DB.prepare(
            "SELECT kind FROM image_content WHERE id=?",
          )
            .bind(i.contentId)
            .first();
          if (!content || content.kind !== kind(k))
            throw fail(400, "Choose a matching content type.");
          await env.DB.prepare(
            "INSERT INTO image_manager_links(manager_id,kind,item_id,content_id) VALUES(?,?,?,?) ON CONFLICT(manager_id,kind,item_id) DO UPDATE SET content_id=excluded.content_id",
          )
            .bind(manager, k, id, i.contentId)
            .run();
        }
        return json({ ok: true });
      }
      if (url.pathname === "/api/images/bundled" && request.method === "POST") {
        const input = await body(request),
          content = await env.DB.prepare(
            "SELECT kind FROM image_content WHERE id=?",
          )
            .bind(input.contentId)
            .first();
        if (!content || !Array.isArray(input.files) || input.files.length > 40)
          throw fail(400, "Choose content and up to forty bundled images.");
        const statements = [];
        for (const f of input.files) {
          if (
            typeof f.path !== "string" ||
            !/^assets\/ranking\/(games|mcu)\/[A-Za-z0-9_-]+\/[^/\\]+\.webp$/.test(
              f.path,
            ) ||
            f.path.includes("..") ||
            f.path.includes("?") ||
            f.path.includes("#")
          )
            throw fail(400, "Invalid bundled ranking image path.");
          const category = f.path.split("/")[2];
          if (
            content.kind !== (category === "mcu" ? "movies" : "games") ||
            !Number.isInteger(f.width) ||
            !Number.isInteger(f.height) ||
            f.width < 1 ||
            f.height < 1 ||
            f.width > 8192 ||
            f.height > 8192 ||
            f.width * f.height > 16_000_000 ||
            !Number.isSafeInteger(f.byte_size) ||
            f.byte_size < 1 ||
            f.byte_size > 5 * 1024 * 1024
          )
            throw fail(400, "Invalid bundled image metadata.");
          const hash = [
            ...new Uint8Array(
              await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(f.path),
              ),
            ),
          ]
            .map((n) => n.toString(16).padStart(2, "0"))
            .join("");
          const id = `bundled:${hash}`;
          statements.push(
            env.DB.prepare(
              "INSERT OR IGNORE INTO image_files(id,location,path,mime,byte_size,width,height,created_by) VALUES(?,?,?,?,?,?,?,?)",
            ).bind(
              id,
              "bundled",
              f.path,
              "image/webp",
              f.byte_size,
              f.width,
              f.height,
              manager,
            ),
            env.DB.prepare(
              "INSERT OR IGNORE INTO image_associations(content_id,file_id) VALUES(?,?)",
            ).bind(input.contentId, id),
          );
        }
        if (statements.length) await env.DB.batch(statements);
        return json({ ok: true });
      }
      if (url.pathname === "/api/images/files" && read) {
        if (!admin) throw fail(403, "Only admins can inspect unused files.");
        return json({
          files: (
            await env.DB.prepare(
              "SELECT f.* FROM image_files f WHERE NOT EXISTS (SELECT 1 FROM image_associations a WHERE a.file_id=f.id) ORDER BY f.created_at LIMIT 48",
            ).all()
          ).results,
        });
      }
      if (url.pathname === "/api/images/files" && request.method === "POST") {
        const multipart = request.headers
          .get("Content-Type")
          ?.startsWith("multipart/form-data");
        const input = multipart
            ? await uploadBody(request)
            : await body(request),
          content = await env.DB.prepare(
            "SELECT id,kind FROM image_content WHERE id=?",
          )
            .bind(input.contentId)
            .first();
        if (!content)
          throw fail(404, "Choose shared content before uploading.");
        if (input.replaceFileId) {
          const original = await env.DB.prepare(
            "SELECT f.bucket FROM image_associations a JOIN image_files f ON f.id=a.file_id WHERE a.content_id=? AND a.file_id=?",
          )
            .bind(content.id, input.replaceFileId)
            .first();
          if (!original)
            throw fail(
              404,
              "The image is no longer associated with this title. Reload before editing.",
            );
          if (original.bucket !== "library")
            throw fail(409, "Manage component-owned images through Footy.");
        }
        let bytes, declaredMime;
        if (multipart) {
          bytes = input.bytes;
          declaredMime = input.mime;
        } else {
          const match = String(input.dataUrl || "").match(
            /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/,
          );
          if (!match || match[2].length > 7_000_000)
            throw fail(413, "Upload a PNG, JPEG, or WebP up to 5 MB.");
          const decoded = atob(match[2]);
          bytes = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++)
            bytes[i] = decoded.charCodeAt(i);
          declaredMime = match[1];
        }
        if (bytes.length > 5 * 1024 * 1024)
          throw fail(413, "Image exceeds 5 MB.");
        const info = imageInfo(bytes);
        if (info.mime !== declaredMime)
          throw fail(415, "Image bytes do not match the declared format.");
        let preset = null;
        if (input.presetId) {
          preset = await env.DB.prepare(
            "SELECT * FROM image_presets WHERE id=?",
          )
            .bind(input.presetId)
            .first();
          if (
            !preset ||
            preset.version !== input.presetVersion ||
            preset.width !== info.width ||
            preset.height !== info.height ||
            ![content.kind, "mcu", "standalone"].includes(preset.context)
          )
            throw fail(
              409,
              "Crop preset changed or does not match this image.",
            );
        }
        const hash = [
          ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        ]
          .map((n) => n.toString(16).padStart(2, "0"))
          .join("");
        let existing = await env.DB.prepare(
          "SELECT * FROM image_files WHERE content_hash=?",
        )
          .bind(hash)
          .first();
        if (!existing) {
          const id = crypto.randomUUID(),
            key = `${id}-${hash}.${{ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[info.mime]}`;
          await reserveMedia(env, "write", bytes.length);
          await env.IMAGES.put(key, bytes, {
            httpMetadata: {
              contentType: info.mime,
              cacheControl: "public, max-age=31536000, immutable",
            },
          });
          try {
            await env.DB.prepare(
              "INSERT INTO image_files(id,object_key,location,path,content_hash,mime,byte_size,width,height,preset_id,preset_version,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            )
              .bind(
                id,
                key,
                "r2",
                `/media/library/${key}`,
                hash,
                info.mime,
                bytes.length,
                info.width,
                info.height,
                preset?.id || null,
                preset?.version || null,
                manager,
              )
              .run();
          } catch (e) {
            // Concurrent identical uploads converge to one record; failed uploads retain their storage reservation.
            existing = await env.DB.prepare(
              "SELECT * FROM image_files WHERE content_hash=?",
            )
              .bind(hash)
              .first();
            if (!existing) throw e;
            await reserveMedia(env, "delete");
            await env.IMAGES.delete(key);
            await releaseMediaStorage(env, bytes.length, `library:${key}`);
          }
          existing ||= await env.DB.prepare(
            "SELECT * FROM image_files WHERE id=?",
          )
            .bind(id)
            .first();
        }
        const association = env.DB.prepare(
          "INSERT OR IGNORE INTO image_associations(content_id,file_id) VALUES(?,?)",
        ).bind(content.id, existing.id);
        if (input.replaceFileId && input.replaceFileId !== existing.id) {
          await env.DB.batch([
            association,
            env.DB.prepare(
              "DELETE FROM image_associations WHERE content_id=? AND file_id=?",
            ).bind(content.id, input.replaceFileId),
          ]);
        } else await association.run();
        return json({ file: existing }, 201);
      }
      if (
        url.pathname === "/api/images/associations" &&
        request.method === "DELETE"
      ) {
        const input = await body(request);
        const file = await env.DB.prepare(
          "SELECT bucket FROM image_files WHERE id=?",
        )
          .bind(input.fileId)
          .first();
        if (file && file.bucket !== "library")
          throw fail(409, "Manage component-owned images through Footy.");
        await env.DB.prepare(
          "DELETE FROM image_associations WHERE content_id=? AND file_id=?",
        )
          .bind(input.contentId, input.fileId)
          .run();
        return json({ ok: true });
      }
      const fileRoute = url.pathname.match(/^\/api\/images\/files\/([^/]+)$/);
      if (fileRoute && request.method === "DELETE") {
        const file = await env.DB.prepare(
          "SELECT * FROM image_files WHERE id=?",
        )
          .bind(decodeURIComponent(fileRoute[1]))
          .first();
        if (!file) return json({ ok: true });
        if (
          await env.DB.prepare(
            "SELECT content_id FROM image_associations WHERE file_id=? LIMIT 1",
          )
            .bind(file.id)
            .first()
        )
          throw fail(
            409,
            "Detach the image from shared content before deleting it.",
          );
        if (file.bucket !== "library")
          throw fail(
            409,
            "Manage this file through its Footy component so player and match references remain consistent.",
          );
        if (file.location === "r2") {
          await reserveMedia(env, "delete");
          const bucket = {
            library: env.IMAGES,
            roster: env.ROSTER_MEDIA,
            match: env.MATCH_MEDIA,
          }[file.bucket];
          if (!bucket) throw fail(503, "File storage is not configured.");
          await bucket.delete(file.object_key);
          await releaseMediaStorage(
            env,
            file.byte_size,
            `${file.bucket}:${file.object_key}`,
          );
        }
        await env.DB.prepare("DELETE FROM image_files WHERE id=?")
          .bind(file.id)
          .run();
        return json({ ok: true });
      }
      return json({ error: "Not found." }, 404);
    } catch (error) {
      return json(
        { error: error.message || "Image request failed." },
        error.status || 500,
      );
    }
  },
};
function withCors(response, headers) {
  const result = new Response(response.body, response);
  for (const key of [
    "Access-Control-Allow-Origin",
    "Access-Control-Expose-Headers",
    "Vary",
  ])
    result.headers.set(key, headers[key]);
  return result;
}
async function body(request) {
  if (Number(request.headers.get("Content-Length")) > 7_100_000)
    throw fail(413, "Request too large.");
  const reader = request.body?.getReader();
  if (!reader) throw fail(400, "Request body required.");
  const decoder = new TextDecoder();
  let size = 0,
    value = "";
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.length;
    if (size > 7_100_000) {
      await reader.cancel();
      throw fail(413, "Request too large.");
    }
    value += decoder.decode(next.value, { stream: true });
  }
  value += decoder.decode();
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error();
    return parsed;
  } catch {
    throw fail(400, "Invalid JSON body.");
  }
}
async function authenticate(request, env) {
  const token = request.headers
    .get("Authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token || !env.MANAGER_AUTH)
    throw fail(401, "Sign in to access the image library.");
  const response = await env.MANAGER_AUTH.fetch(
    "https://rankings.internal/api/auth/verify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: token }),
    },
  );
  const value = await response.json();
  if (!response.ok || !value.ok || !value.managerId)
    throw fail(401, "Sign in again.");
  return String(value.managerId);
}
async function filesFor(env, ids) {
  const files = [];
  for (
    let offset = 0;
    offset < ids.length && files.length < 1000;
    offset += 80
  ) {
    const batch = ids.slice(offset, offset + 80);
    const result = await env.DB.prepare(
      `SELECT f.*,a.content_id FROM image_associations a JOIN image_files f ON f.id=a.file_id WHERE a.content_id IN (${batch.map(() => "?").join(",")}) ORDER BY f.created_at LIMIT ?`,
    )
      .bind(...batch, 1000 - files.length)
      .all();
    files.push(...result.results);
  }
  return files;
}

async function uploadBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw fail(400, "Image upload required.");
  const chunks = [];
  let size = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.length;
    if (size > 5 * 1024 * 1024 + 64 * 1024) {
      await reader.cancel();
      throw fail(413, "Image exceeds 5 MB.");
    }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const form = await new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: bytes,
  }).formData();
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size > 5 * 1024 * 1024)
    throw fail(413, "Upload an image up to 5 MB.");
  return {
    contentId: String(form.get("contentId") || ""),
    replaceFileId: String(form.get("replaceFileId") || ""),
    presetId: String(form.get("presetId") || ""),
    presetVersion: Number(form.get("presetVersion")),
    bytes: new Uint8Array(await file.arrayBuffer()),
    mime: file.type,
  };
}
