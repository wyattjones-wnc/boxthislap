export function createThemeController({ storageKey, toggle }) {
  function getCurrentTheme() {
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  }

  function setTheme(theme) {
    const normalizedTheme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = normalizedTheme;

    try {
      localStorage.setItem(storageKey, normalizedTheme);
    } catch (error) {
      console.warn("Unable to save theme preference", error);
    }

    syncThemeToggle();
  }

  function syncThemeToggle() {
    if (!toggle) {
      return;
    }

    const theme = getCurrentTheme();
    toggle.textContent = theme === "dark" ? "Dark" : "Light";
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
  }

  function toggleTheme() {
    setTheme(getCurrentTheme() === "dark" ? "light" : "dark");
  }

  toggle?.addEventListener("click", toggleTheme);

  return {
    getCurrentTheme,
    setTheme,
    syncThemeToggle,
  };
}
