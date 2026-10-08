/** New Footy files join the shared registry without scanning or migrating existing buckets. */
export async function recordFootyFile(env, file) {
  const contentId = `footy:${file.contentKey}`;
  const title = String(file.title).slice(0, 200);
  const normalized = title
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  const keyHash = [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(file.key)),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  const fileId = `${file.bucket}:${keyHash}`;
  await env.DB.batch([
    env.DB.prepare(
      "INSERT OR IGNORE INTO image_content(id,kind,title,external_key,created_by) VALUES(?,?,?,?,?)",
    ).bind(contentId, "footy", title, contentId, file.managerId),
    env.DB.prepare(
      "INSERT OR IGNORE INTO image_title_aliases(kind,normalized_title,content_id) VALUES(?,?,?)",
    ).bind("footy", normalized, contentId),
    env.DB.prepare(
      "INSERT OR IGNORE INTO image_files(id,object_key,bucket,location,path,mime,byte_size,width,height,preset_id,preset_version,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
    ).bind(
      fileId,
      file.key,
      file.bucket,
      "r2",
      file.path,
      file.mime,
      file.bytes,
      file.width,
      file.height,
      file.preset?.id || null,
      file.preset?.version || null,
      file.managerId,
    ),
    env.DB.prepare(
      "INSERT OR IGNORE INTO image_associations(content_id,file_id) VALUES(?,?)",
    ).bind(contentId, fileId),
  ]);
}
export async function forgetFootyFile(env, bucket, key) {
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM image_associations WHERE file_id IN (SELECT id FROM image_files WHERE bucket=? AND object_key=?)",
    ).bind(bucket, key),
    env.DB.prepare(
      "DELETE FROM image_files WHERE bucket=? AND object_key=?",
    ).bind(bucket, key),
  ]);
}
