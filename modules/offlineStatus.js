let settingsText =
  "Saved — Footy: not saved · Next: not saved · Ranking: not saved";

export function getOfflineSettingsText() {
  return settingsText;
}
export function subscribeOfflineSettings(listener) {
  window.addEventListener("boxthislap:offline-status", listener);
  return () =>
    window.removeEventListener("boxthislap:offline-status", listener);
}
export function updateOfflineSettings(text) {
  if (settingsText === text) return;
  settingsText = text;
  window.dispatchEvent(new Event("boxthislap:offline-status"));
}
