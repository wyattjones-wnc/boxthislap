import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Menu } from "lucide-react";
import { memo } from "react";
import { IconButton } from "../components/IconButton/IconButton";
import { getNavScope, navItems, type NavItem, type NavScope } from "./routes";
import { useAppState } from "./providers";
import styles from "./Shell.module.css";

const headerArt = [
  {
    name: "default",
    image: "assets/final/default-header.jpg?v=202607210001",
    landscape: "assets/final/default-header-small.jpg?v=202607210002",
  },
  {
    name: "the-monster-maniac",
    image: "https://card.psnprofiles.com/1/TheMonsterManiac.png",
  },
  {
    name: "world-cup",
    image: "assets/final/2026-world-cup-header.jpg?v=202607120001",
    landscape: "assets/final/2026-world-cup-header-small.jpg?v=202607120001",
  },
  {
    name: "fantasy-critic-2025",
    image: "assets/fantasy-critic-2025-header.jpg?v=202607230004",
    landscape: "assets/fantasy-critic-2025-header-landscape.jpg?v=202607230004",
  },
  {
    name: "fantasy-critic-2026",
    image: "assets/fantasy-critic-2026-header.png?v=202607230006",
    landscape: "assets/fantasy-critic-2026-header-landscape.png?v=202607230006",
  },
  {
    name: "formula-one-2024",
    image: "assets/final/2024-formula-1-header.jpg?v=202607120001",
    landscape: "assets/final/2024-formula-1-header-small.jpg?v=202607120001",
  },
  {
    name: "formula-one-2025",
    image: "assets/final/2025-formual-1-header.jpg?v=202607120001",
    landscape: "assets/final/2025-formual-1-header-small.jpg?v=202607120001",
  },
  {
    name: "formula-one-2026",
    image: "assets/final/2026-formula-1-header.jpg?v=202607120001",
    landscape: "assets/final/2026-formula-1-header-small.jpg?v=202607120001",
  },
  {
    name: "fantasy-office-2025",
    image: "assets/final/2025-fantasy-office-header.jpg?v=202607120001",
    landscape:
      "assets/final/2025-fantasy-office-header-small.jpg?v=202607120001",
  },
  {
    name: "fantasy-office-2026",
    image: "assets/fantasy-office-2026-header.png?v=202607230006",
    landscape: "assets/fantasy-office-2026-header-landscape.png?v=202607230006",
  },
] as const;

export function SiteShell() {
  const { route, session } = useAppState();
  const scope = getNavScope(route);
  const isAdmin = Boolean(session?.isAdmin || session?.manager?.isAdmin);
  const displayName =
    session?.manager?.displayName || session?.manager?.name || "Manager";
  const brandImage = window.location.pathname.includes("/dev/")
    ? "assets/dev-apple-touch-icon.png"
    : "assets/box-this-lap-logo.jpg";
  const activeArt = scope === "home" ? "default" : scope;

  return (
    <>
      <nav className="topbar" aria-label="Primary">
        <a className="brand" href="#footy" data-page-link="footy">
          <img
            src={brandImage}
            alt="Box This Lap"
            decoding="async"
            data-brand-logo
          />
        </a>
        {headerArt.map((art) => (
          <div
            className={`header-page-art${art.name === activeArt ? " is-active" : ""}`}
            data-header-art={art.name}
            aria-hidden="true"
            key={art.name}
          >
            {"landscape" in art ? (
              <picture>
                <source
                  srcSet={art.landscape}
                  media="(orientation: landscape) and (max-height: 520px)"
                />
                <img src={art.image} alt="" decoding="async" loading="lazy" />
              </picture>
            ) : (
              <img src={art.image} alt="" decoding="async" />
            )}
          </div>
        ))}
        {(Object.keys(navItems) as NavScope[]).map((navScope) => (
          <div
            className="nav-links"
            data-nav-scope={navScope}
            role="tablist"
            aria-label={`${navScope.replaceAll("-", " ")} sections`}
            hidden={scope !== navScope}
            key={navScope}
          >
            {navItems[navScope].map((item) => (
              <NavLink
                item={item}
                route={route}
                session={Boolean(session)}
                key={item.route}
              />
            ))}
          </div>
        ))}
        <div className={styles.mobileNav}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <IconButton icon={<Menu />} label="Open site navigation" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={styles.mobileContent}
                align="end"
                sideOffset={8}
              >
                {navItems[scope]
                  .filter(
                    (item) =>
                      !item.testOnly && (!item.loginOnly || Boolean(session)),
                  )
                  .map((item) => (
                    <DropdownMenu.Item asChild key={item.route}>
                      <a
                        className={styles.mobileLink}
                        data-active={String(route === item.route)}
                        href={`#${item.route}`}
                      >
                        {item.label}
                      </a>
                    </DropdownMenu.Item>
                  ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </nav>
      <div className="login-row">
        <div className="login-row-inner">
          <LegacyShortcuts />
          <div className="login-actions">
            <a
              className="login-button"
              id="login-open-button"
              href="#login"
              data-page-link="login"
              hidden={Boolean(session)}
            >
              Log In
            </a>
            <div className="profile-menu" id="profile-menu" hidden={!session}>
              <button
                className="profile-button"
                id="profile-menu-button"
                type="button"
                aria-expanded="false"
              >
                <span className="profile-avatar" aria-hidden="true">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <span id="profile-name">{displayName}</span>
              </button>
              <div className="profile-dropdown" id="profile-dropdown" hidden>
                <a
                  href="#the-monster-maniac"
                  data-page-link="the-monster-maniac"
                  data-admin-only
                  hidden={!isAdmin}
                >
                  TheMonsterManiac
                </a>
                <a
                  href="#guides"
                  data-page-link="guides"
                  data-non-admin-only
                  hidden={isAdmin}
                >
                  Guides
                </a>
                <a href="#manager-hub" data-page-link="manager-hub">
                  Manager Hub
                </a>
                <a
                  href="#collectibles"
                  data-page-link="collectibles"
                  data-admin-only
                  hidden={!isAdmin}
                >
                  Collectibles
                </a>
                <a href="#account-settings" data-page-link="account-settings">
                  Account Settings
                </a>
                <button id="logout-button" type="button">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function NavLink({
  item,
  route,
  session,
}: {
  item: NavItem;
  route: string;
  session: boolean;
}) {
  return (
    <a
      className={route === item.route ? "is-active" : undefined}
      href={`#${item.route}`}
      data-page-link={item.route}
      data-login-only={item.loginOnly ? "" : undefined}
      data-test-rules-link={item.testOnly ? "" : undefined}
      hidden={Boolean(item.loginOnly && !session) || Boolean(item.testOnly)}
      role="tab"
    >
      {item.label}
    </a>
  );
}

const LegacyShortcuts = memo(function LegacyShortcuts() {
  return (
    <div
      className="followed-team-shortcuts"
      id="followed-team-shortcuts"
      aria-label="Followed teams"
    />
  );
});
