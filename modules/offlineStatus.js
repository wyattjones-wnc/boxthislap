let settingsText =
  "Offline access is being prepared. Footy, Next, and Ranking can use saved data. Editing, 10/10 Performances, Seen Matches, and full league schedules need a connection.";

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
