import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/tokens.css";

const shellRoot = document.querySelector(".site-header");
const loginRoot = document.querySelector('[data-page="login"]');
const accountRoot = document.querySelector('[data-page="account-settings"]');
const footerRoot = document.querySelector(".site-footer");

if (!shellRoot || !loginRoot || !accountRoot || !footerRoot) {
  throw new Error(
    "The React application shell could not find its mount points.",
  );
}

loginRoot.replaceChildren();
accountRoot.replaceChildren();
footerRoot.replaceChildren();

flushSync(() => {
  createRoot(shellRoot).render(
    <App
      accountRoot={accountRoot}
      footerRoot={footerRoot}
      loginRoot={loginRoot}
    />,
  );
});

void import("../script.js");
