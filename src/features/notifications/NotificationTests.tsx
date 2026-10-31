import { useState, useSyncExternalStore } from "react";
import { useAppState } from "../../app/providers";
import { FOOTY_PUSH_ENDPOINT } from "../../../modules/siteConfig.js";

const key = "boxThisLapNotificationTests";
const eventName = "boxthislap:notification-tests";
function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", listener);
  };
}
function readEnabled() {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}
function useTestControls() {
  const { session, isOnline } = useAppState();
  const enabled = useSyncExternalStore(subscribe, readEnabled);
  return {
    admin: Boolean(session?.isAdmin || session?.manager?.isAdmin),
    enabled,
    isOnline,
  };
}

export function NotificationTestSetting() {
  const { admin, enabled } = useTestControls();
  const [error, setError] = useState("");
  if (!admin) return null;
  return (
    <section className="account-settings-card">
      <div>
        <h2>Notification tests</h2>
        <p>
          Show test buttons beside notification bells on this device. Enable
          alerts with the bell first, then send a test push.
        </p>
      </div>
      <label className="toggle-control">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            try {
              localStorage.setItem(key, String(event.target.checked));
              window.dispatchEvent(new Event(eventName));
              setError("");
            } catch {
              setError("Unable to save this setting on this device.");
            }
          }}
        />{" "}
        Show notification test buttons
      </label>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export function NotificationTestButton({
  topic,
  label,
}: {
  topic: "footy" | "formula-one" | "league-drafts";
  label: string;
}) {
  const { admin, enabled, isOnline } = useTestControls();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  if (!admin || !enabled) return null;
  return (
    <span>
      <button
        type="button"
        className="action-button"
        disabled={busy || !isOnline}
        aria-label={`Test ${label} notification`}
        onClick={async () => {
          setBusy(true);
          setStatus("");
          try {
            if (
              !("serviceWorker" in navigator) ||
              !("Notification" in window) ||
              Notification.permission !== "granted"
            )
              throw new Error(
                "Enable notifications with the bell first. On iPhone, open the site from your Home Screen.",
              );
            const registration =
              await navigator.serviceWorker.getRegistration();
            const subscription =
              await registration?.pushManager?.getSubscription();
            if (!subscription)
              throw new Error(
                "Enable alerts with the bell first to register this device.",
              );
            const token = await window.boxThisLapGetManagerAccessToken?.();
            if (!token) throw new Error("Log in again to test notifications.");
            const response = await fetch(`${FOOTY_PUSH_ENDPOINT}/test`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ endpoint: subscription.endpoint, topic }),
            });
            const result = (await response.json()) as { error?: string };
            if (!response.ok)
              throw new Error(
                result.error || "Unable to send test notification.",
              );
            setStatus(
              "Test push accepted. Check this device’s notifications; acceptance does not confirm delivery.",
            );
          } catch (error) {
            setStatus((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Sending…" : "Test push"}
      </button>
      <span role="status" aria-live="polite">
        {status}
      </span>
    </span>
  );
}
