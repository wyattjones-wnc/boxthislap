import {
  BookOpen,
  Boxes,
  CalendarDays,
  Calculator,
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  Clapperboard,
  ClipboardList,
  Flag,
  GitFork,
  Heart,
  House,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  LogIn,
  LogOut,
  Medal,
  ScrollText,
  Settings,
  Shield,
  Trophy,
  Video,
  type LucideIcon,
} from "lucide-react";
import { memo, useEffect, useRef } from "react";
import { SoccerBallIcon } from "../components/icons";
import { getNavScope, navItems, type NavItem, type NavScope } from "./routes";
import { useAppState } from "./providers";
import "./Shell.module.css";

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

const navIcons: Record<string, LucideIcon> = {
  bracket: GitFork,
  footy: SoccerBallIcon,
  guides: BookOpen,
  leagues: Trophy,
  next: ListTodo,
  rankings: ChartNoAxesColumnIncreasing,
  results: Medal,
  rules: ScrollText,
  standings: ChartNoAxesColumnIncreasing,
  todo: ListChecks,
  want: Heart,
  youtube: Video,
  "the-monster-maniac": House,
  "fantasy-office-2025-draft": ClipboardList,
  "fantasy-office-2025-movies": Clapperboard,
  "fantasy-office-2025-results": Medal,
  "fantasy-office-2026-draft": ClipboardList,
  "fantasy-office-2026-movies": Clapperboard,
  "fantasy-office-2026-results": Medal,
  "formula-1-2024-questions": CircleHelp,
  "formula-1-2024-results": Medal,
  "formula-1-2025-questions": CircleHelp,
  "formula-1-2025-results": Medal,
  "formula-1-2025-weekly": CalendarDays,
  "formula-1-2026-questions": CircleHelp,
  "formula-1-2026-results": Medal,
  "formula-1-2026-weekly": CalendarDays,
};

export function SiteShell() {
  const { route, session } = useAppState();
  const topbarRef = useRef<HTMLElement>(null);
  const scope = getNavScope(route);
  const isAdmin = Boolean(session?.isAdmin || session?.manager?.isAdmin);
  const displayName =
    session?.manager?.displayName || session?.manager?.name || "Manager";
  const brandImage = window.location.pathname.includes("/dev/")
    ? "assets/dev-apple-touch-icon.png"
    : "assets/box-this-lap-logo.jpg";
  const activeArt = scope === "home" ? "default" : scope;

  useEffect(() => {
    if (!window.matchMedia("(max-width: 760px)").matches) return;
    const activeLink = topbarRef.current?.querySelector<HTMLAnchorElement>(
      '.nav-links:not([hidden]) a[aria-current="page"]',
    );
    const navigationRail = activeLink?.closest<HTMLElement>(".nav-links");
    if (!activeLink || !navigationRail) return;
    navigationRail.scrollTo({
      left:
        activeLink.offsetLeft -
        (navigationRail.clientWidth - activeLink.offsetWidth) / 2,
    });
  }, [route]);

  return (
    <>
      <nav className="topbar" aria-label="Primary" ref={topbarRef}>
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
            data-nav-scroll
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
      </nav>
      <div className="login-row">
        <div className="login-row-inner">
          <LegacyShortcuts />
          <div className="login-actions">
            {scope.startsWith("formula-one-") ? (
              <a
                className={`formula-one-calculator-shortcut${route === "formula-1-2026-calculator" ? " is-active" : ""}`}
                href="#formula-1-2026-calculator"
                data-page-link="formula-1-2026-calculator"
                aria-label="Formula 1 points calculator"
                title="Formula 1 points calculator"
                aria-current={
                  route === "formula-1-2026-calculator" ? "page" : undefined
                }
              >
                <Calculator aria-hidden="true" />
              </a>
            ) : null}
            <a
              className="login-button"
              id="login-open-button"
              href="#login"
              data-page-link="login"
              hidden={Boolean(session)}
            >
              <LogIn aria-hidden="true" />
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
                  <Shield aria-hidden="true" />
                  TheMonsterManiac
                </a>
                <a
                  href="#guides"
                  data-page-link="guides"
                  data-non-admin-only
                  hidden={isAdmin}
                >
                  <BookOpen aria-hidden="true" />
                  Guides
                </a>
                <a href="#manager-hub" data-page-link="manager-hub">
                  <LayoutDashboard aria-hidden="true" />
                  Manager Hub
                </a>
                <a
                  href="#collectibles"
                  data-page-link="collectibles"
                  data-admin-only
                  hidden={!isAdmin}
                >
                  <Boxes aria-hidden="true" />
                  Collectibles
                </a>
                <a href="#account-settings" data-page-link="account-settings">
                  <Settings aria-hidden="true" />
                  Account Settings
                </a>
                <button id="logout-button" type="button">
                  <LogOut aria-hidden="true" />
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
  const Icon = navIcons[item.route] ?? Flag;

  return (
    <a
      className={route === item.route ? "is-active" : undefined}
      href={`#${item.route}`}
      data-page-link={item.route}
      data-login-only={item.loginOnly ? "" : undefined}
      data-test-rules-link={item.testOnly ? "" : undefined}
      hidden={Boolean(item.loginOnly && !session) || Boolean(item.testOnly)}
      aria-current={route === item.route ? "page" : undefined}
      role="tab"
    >
      <Icon className="nav-link-icon" aria-hidden="true" />
      <span>{item.label}</span>
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
