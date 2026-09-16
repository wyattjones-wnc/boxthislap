import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { App, type OperationalRoots } from "./app/App";
import "./styles/tokens.css";

const shellRoot = document.querySelector(".site-header");
const loginRoot = document.querySelector('[data-page="login"]');
const accountRoot = document.querySelector('[data-page="account-settings"]');
const footerRoot = document.querySelector(".site-footer");
const footyDialogsRoot = document.createElement("div");
footyDialogsRoot.id = "footy-operational-dialog-root";
document.body.append(footyDialogsRoot);
const operationalRoots = {
  draftList: document.querySelector('[data-page="draft-list"]'),
  footy: document.querySelector('[data-page="footy"]'),
  footyCustomSchedule: document.querySelector(
    '[data-page="footy-custom-schedule"]',
  ),
  footyDialogs: footyDialogsRoot,
  footyGoalAssists: document.querySelector('[data-page="footy-goal-assists"]'),
  footyMissingNotes: document.querySelector(
    '[data-page="footy-missing-notes"]',
  ),
  footyPerfect: document.querySelector('[data-page="footy-perfect"]'),
  footySeen: document.querySelector('[data-page="footy-seen"]'),
  footyTeam: document.querySelector('[data-page="footy-team"]'),
  guides: document.querySelector('[data-page="guides"]'),
  managerAwards: document.querySelector('[data-page="manager-awards"]'),
  managerHub: document.querySelector('[data-page="manager-hub"]'),
  next: document.querySelector('[data-page="next"]'),
  rankings: document.querySelector('[data-page="rankings"]'),
  todo: document.querySelector('[data-page="todo"]'),
  want: document.querySelector('[data-page="want"]'),
};
const hasOperationalRoots = Object.values(operationalRoots).every(Boolean);

if (
  !shellRoot ||
  !loginRoot ||
  !accountRoot ||
  !footerRoot ||
  !hasOperationalRoots
) {
  throw new Error(
    "The React application shell could not find its mount points.",
  );
}

loginRoot.replaceChildren();
accountRoot.replaceChildren();
footerRoot.replaceChildren();
Object.values(operationalRoots).forEach((root) => root?.replaceChildren());
[
  "next-item-dialog-root",
  "todo-item-dialog-root",
  "want-item-dialog-root",
].forEach((id) => {
  const root = document.createElement("div");
  root.id = id;
  root.dataset.legacyDialogRoot = "";
  document.body.append(root);
});

flushSync(() => {
  createRoot(shellRoot).render(
    <App
      accountRoot={accountRoot}
      footerRoot={footerRoot}
      loginRoot={loginRoot}
      operationalRoots={operationalRoots as OperationalRoots}
    />,
  );
});

const initialRoute = window.location.hash.slice(1).split("?")[0];
if (Object.values(operationalRoots).some((root) => root?.id === initialRoute)) {
  window.requestAnimationFrame(() => window.scrollTo({ left: 0, top: 0 }));
}

void import("../script.js");
