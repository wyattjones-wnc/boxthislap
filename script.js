import { loadSiteData } from "./dataLoader.js";

const pageLinks = document.querySelectorAll("[data-page-link]");
const pages = document.querySelectorAll("[data-page]");
const tabs = document.querySelectorAll("[data-tab]");
const tabPanels = document.querySelectorAll("[data-tab-panel]");

function showPage(pageName) {
  pages.forEach((page) => {
    page.classList.toggle("is-active", page.dataset.page === pageName);
  });

  pageLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.pageLink === pageName);
  });
}

function showTab(tabName) {
  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.tabPanel === tabName);
  });
}

pageLinks.forEach((link) => {
  link.addEventListener("click", () => {
    showPage(link.dataset.pageLink);
  });
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    showTab(tab.dataset.tab);
  });
});

window.addEventListener("hashchange", () => {
  showPage(window.location.hash.replace("#", "") || "results");
});

showPage(window.location.hash.replace("#", "") || "results");

loadSiteData()
  .then((data) => {
    window.boxThisLapData = data;
    console.info("Box This Lap data loaded", data);
  })
  .catch((error) => {
    console.error("Box This Lap data failed to load", error);
  });
