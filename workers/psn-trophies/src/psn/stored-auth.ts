import type { PsnEnvironment } from "../types";

export async function getPsnNpsso(env: PsnEnvironment): Promise<string> {
  const row = await env.DB.prepare("SELECT cipher_text, iv FROM psn_auth WHERE id = 1")
    .first<{ cipher_text?: unknown; iv?: unknown }>();
  if (!row) {
    const fallback = env.PSN_NPSSO?.trim() || "";
    if (!fallback) throw new Error("PSN authentication is not configured.");
    return fallback;
  }

  const key = await importEncryptionKey(env);
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(String(row.iv || "")).buffer as ArrayBuffer },
    key,
    decodeBase64(String(row.cipher_text || "")).buffer as ArrayBuffer,
  );
  return new TextDecoder().decode(clear);
}

export async function savePsnNpsso(env: PsnEnvironment, npsso: string, managerId: string): Promise<string> {
  const key = await importEncryptionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(npsso),
  );
  const updatedAt = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO psn_auth (id, cipher_text, iv, updated_at, updated_by) VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET cipher_text = excluded.cipher_text, iv = excluded.iv,
      updated_at = excluded.updated_at, updated_by = excluded.updated_by
  `).bind(encodeBase64(new Uint8Array(cipher)), encodeBase64(iv), updatedAt, managerId).run();
  return updatedAt;
}

export async function getPsnAuthStatus(env: PsnEnvironment): Promise<{ configured: boolean; updatedAt: string | null }> {
  const row = await env.DB.prepare("SELECT updated_at FROM psn_auth WHERE id = 1").first<{ updated_at?: unknown }>();
  return {
    configured: Boolean(row || env.PSN_NPSSO),
    updatedAt: row?.updated_at ? String(row.updated_at) : null,
  };
}

async function importEncryptionKey(env: PsnEnvironment): Promise<CryptoKey> {
  const encoded = env.PSN_AUTH_ENCRYPTION_KEY?.trim() || "";
  if (!encoded) throw new Error("PSN auth encryption is not configured.");
  const bytes = decodeBase64(encoded);
  if (bytes.length !== 32) throw new Error("PSN auth encryption key is invalid.");
  return crypto.subtle.importKey("raw", bytes.buffer as ArrayBuffer, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
