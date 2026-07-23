const PAGE_ALIASES = {
  "fantasy-office-2025": "fantasy-office-2025-results",
  "fantasy-office-2026": "fantasy-office-2026-draft",
  "formula-1-2024": "formula-1-2024-questions",
  "formula-1-2025": "formula-1-2025-questions",
  "formula-1-2026": "formula-1-2026-questions",
  "manager-scores": "standings",
  "player-scores": "standings",
};

const HOME_PAGES = ["footy", "leagues", "login", "manager-hub"];
const STANDINGS_TABS = ["players-championship", "nations-league", "manager-results"];
const WORLD_CUP_PAGES = ["today", "tomorrow", "results", "draft", "standings", "rules", "matches", "bracket", "testing"];

export function createRouter({
  draftPanels,
  draftViewButtons,
  headerArt,
  navGroups,
  onPageShown = () => {},
  onStandingsTabShown = () => {},
  pageLinks,
  pages,
  shouldBlockRulesPage = () => false,
  tabPanels,
  tabs,
}) {
  function showPage(pageName, options = {}) {
    const allowedPageName = PAGE_ALIASES[pageName] || pageName;
    const testRulesBlocked = allowedPageName === "rules" && shouldBlockRulesPage();
    const pageExists = !testRulesBlocked && [...pages].some((page) => page.dataset.page === allowedPageName);
    const activePageName = pageExists ? allowedPageName : "footy";

    pages.forEach((page) => {
      page.classList.toggle("is-active", page.dataset.page === activePageName);
    });

    pageLinks.forEach((link) => {
      link.classList.toggle("is-active", link.dataset.pageLink === activePageName);
    });

    headerArt.forEach((art) => {
      art.classList.toggle("is-active", art.dataset.headerArt === getHeaderArtName(activePageName));
    });

    rememberNavScope(activePageName);

    navGroups.forEach((group) => {
      group.hidden = group.dataset.navScope !== getNavScope(activePageName);
    });

    document.body.classList.remove("is-routing");
    window.boxThisLapMarkReady?.();

    if (options.scrollToTop) {
      scrollToPageTop();
    }

    onPageShown(activePageName);
  }

  function showTab(tabName, options = {}) {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.tab === tabName;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    tabPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.tabPanel === tabName);
    });

    if (STANDINGS_TABS.includes(tabName)) {
      onStandingsTabShown();
    }

    if (options.scrollToTop) {
      scrollToPageTop();
    }
  }

  function showDraftView(viewName) {
    const activeView = viewName === "players" ? "players" : "nations";

    draftViewButtons.forEach((button) => {
      const isActive = button.dataset.draftView === activeView;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    draftPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.draftPanel === activeView);
    });
  }

  return {
    showDraftView,
    showPage,
    showTab,
  };
}

export function scrollToPageTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

function getHeaderArtName(pageName) {
  if (getNavScope(pageName) === "home") {
    return "default";
  }

  if (pageName.startsWith("formula-1-2024")) {
    return "formula-one-2024";
  }

  if (pageName.startsWith("formula-1-2025")) {
    return "formula-one-2025";
  }

  if (pageName.startsWith("formula-1-2026")) {
    return "formula-one-2026";
  }

  if (pageName.startsWith("fantasy-critic-2025")) {
    return "fantasy-critic-2025";
  }

  if (pageName.startsWith("fantasy-office-2025")) {
    return "fantasy-office-2025";
  }

  if (pageName.startsWith("fantasy-office-2026")) {
    return "default";
  }

  if (getNavScope(pageName) === "world-cup") {
    return "world-cup";
  }

  return "default";
}

function getNavScope(pageName) {
  if (HOME_PAGES.includes(pageName)) {
    return "home";
  }

  if (pageName.startsWith("formula-1-2024")) {
    return "formula-one-2024";
  }

  if (pageName.startsWith("formula-1-2025")) {
    return "formula-one-2025";
  }

  if (pageName.startsWith("formula-1-2026")) {
    return "formula-one-2026";
  }

  if (pageName.startsWith("fantasy-office-2025")) {
    return "fantasy-office-2025";
  }

  if (pageName.startsWith("fantasy-office-2026")) {
    return "fantasy-office-2026";
  }

  if (isWorldCupPage(pageName)) {
    return "world-cup";
  }

  return "home";
}

function rememberNavScope(pageName) {
  if (pageName.startsWith("formula-1-2024")) {
    sessionStorage.setItem("boxThisLapActiveNavScope", "formula-one-2024");
    return;
  }

  if (pageName.startsWith("formula-1-2025")) {
    sessionStorage.setItem("boxThisLapActiveNavScope", "formula-one-2025");
    return;
  }

  if (pageName.startsWith("formula-1-2026")) {
    sessionStorage.setItem("boxThisLapActiveNavScope", "formula-one-2026");
    return;
  }

  if (pageName.startsWith("fantasy-office-2025")) {
    sessionStorage.setItem("boxThisLapActiveNavScope", "fantasy-office-2025");
    return;
  }

  if (pageName.startsWith("fantasy-office-2026")) {
    sessionStorage.setItem("boxThisLapActiveNavScope", "fantasy-office-2026");
    return;
  }

  if (isWorldCupPage(pageName)) {
    sessionStorage.setItem("boxThisLapActiveNavScope", "world-cup");
    return;
  }

  if (HOME_PAGES.includes(pageName)) {
    sessionStorage.setItem("boxThisLapActiveNavScope", "home");
  }
}

function isWorldCupPage(pageName) {
  return WORLD_CUP_PAGES.includes(pageName);
}
