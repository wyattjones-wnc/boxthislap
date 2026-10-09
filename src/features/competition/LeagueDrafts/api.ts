import { FOOTY_PUSH_ENDPOINT } from "../../../../modules/siteConfig.js";
import type { Draft, League } from "./types";

declare global {
  interface Window {
    boxThisLapGetManagerAccessToken?: () => Promise<string>;
  }
}

export function draftEndpoint() {
  if (import.meta.env.VITE_LEAGUE_DRAFTS_ENDPOINT)
    return String(import.meta.env.VITE_LEAGUE_DRAFTS_ENDPOINT).replace(
      /\/$/,
      "",
    );
  if (
    window.location.pathname.startsWith("/boxthislap/dev/") ||
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  )
    return "https://box-this-lap-league-drafts-dev.boxthislap.workers.dev";
  return "";
}

export function draftTestSite() {
  return (
    window.location.pathname.startsWith("/boxthislap/dev/") ||
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  );
}

export async function draftPushDeviceEnabled(): Promise<boolean> {
  if (
    !("serviceWorker" in navigator) ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  )
    return false;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager?.getSubscription();
  const token = await window.boxThisLapGetManagerAccessToken?.();
  if (!subscription || !token) return false;
  const response = await fetch(`${FOOTY_PUSH_ENDPOINT}/subscription-status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  if (!response.ok) return false;
  const body = (await response.json()) as {
    registered: boolean;
    topics?: Record<string, boolean>;
  };
  return body.registered && Boolean(body.topics?.["league-drafts"]);
}

export async function draftRequest<T>(
  path: string,
  authenticated: boolean,
  options: RequestInit = {},
): Promise<T> {
  const endpoint = draftEndpoint();
  if (!endpoint)
    throw new Error("League drafting is currently available on dev.");
  const token = authenticated
    ? await window.boxThisLapGetManagerAccessToken?.()
    : "";
  if (authenticated && !token) throw new Error("Log in again to continue.");
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok || value.ok === false)
    throw new Error(
      value.error || "Draft service could not be reached. Retry in a moment.",
    );
  return value as T;
}

export function draftQueryKey(managerId: string, league?: League) {
  return ["league-drafts", managerId, league || "hub"] as const;
}

export function draftLink(draft: Draft, mode = "draft") {
  return `#${draft.league}-${draft.year}-${mode}?draft=${draft.id}`;
}

export function managerName(draft: Draft, id: string) {
  return (
    draft.participants.find((manager) => manager.id === id)?.name || "Manager"
  );
}

function pushKeyBytes(value: string) {
  const text = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}

export async function enableDraftPush() {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  )
    throw new Error(
      "Browser push is unavailable. On iPhone, add the site to your Home Screen and open it there.",
    );
  // This function is called directly from a button; permission is never requested on load.
  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error(
      "Browser notifications are blocked or were not allowed. Manager Hub tasks remain available.",
    );
  const token = await window.boxThisLapGetManagerAccessToken?.();
  if (!token) throw new Error("Log in again to enable browser push.");
  await navigator.serviceWorker.register("service-worker.js");
  const registration = await navigator.serviceWorker.ready;
  const keyResponse = await fetch(`${FOOTY_PUSH_ENDPOINT}/vapid-public-key`);
  if (!keyResponse.ok) throw new Error("Browser push could not be configured.");
  const key = (await keyResponse.json()) as { publicKey: string };
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: pushKeyBytes(key.publicKey),
    }));
  const response = await fetch(`${FOOTY_PUSH_ENDPOINT}/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      topic: "league-drafts",
      pageUrl: ["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? "https://wyattjones-wnc.github.io/boxthislap/dev/"
        : window.location.href,
      userAgent: navigator.userAgent,
    }),
  });
  if (!response.ok)
    throw new Error(
      "The browser subscription could not be saved. Retry after the draft push service is deployed.",
    );
}
