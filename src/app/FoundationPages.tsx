import {
  getOfflineSettingsText,
  subscribeOfflineSettings,
} from "../../modules/offlineStatus.js";
import { FloatingField } from "../components/FloatingField/FloatingField";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  Dumbbell,
  LayoutDashboard,
  ListTodo,
  Settings,
  Trophy,
} from "lucide-react";
import { memo, useSyncExternalStore, type ReactNode } from "react";
import styles from "./Shell.module.css";
import { useAppState } from "./providers";

function OfflineStatusNote() {
  const text = useSyncExternalStore(
    subscribeOfflineSettings,
    getOfflineSettingsText,
  );
  return (
    <p id="offline-settings-status" role="status">
      {text}
    </p>
  );
}

export const LoginPage = memo(function LoginPage() {
  return (
    <>
      <div className={`section-heading ${styles.modernPageHeading}`}>
        <p className="eyebrow">Manager access</p>
        <h1>Manager Login</h1>
      </div>
      <form className="login-panel" id="login-panel">
        <p>
          This passphrase is only a lightweight site check. Do not reuse an
          important password.
        </p>
        <FloatingField className="select-control">
          <span>Manager</span>
          <select id="login-manager-select" defaultValue="">
            <option value="">Loading managers...</option>
          </select>
        </FloatingField>
        <FloatingField className="filter-control" id="login-passphrase-group">
          <span>Passphrase</span>
          <input
            id="login-passphrase"
            type="text"
            autoComplete="off"
            placeholder="Passphrase"
          />
        </FloatingField>
        <div className="login-setup-panel" id="login-recovery-panel" hidden>
          <p className="login-recovery-question" id="login-recovery-question" />
          <FloatingField className="filter-control">
            <span>Recovery Answer</span>
            <input
              id="login-recovery-answer"
              type="text"
              autoComplete="off"
              placeholder="Answer"
            />
          </FloatingField>
        </div>
        <div
          className="login-setup-panel"
          id="login-new-passphrase-panel"
          hidden
        >
          <FloatingField className="filter-control">
            <span>New Passphrase</span>
            <input
              id="login-new-passphrase"
              type="text"
              autoComplete="off"
              placeholder="New passphrase"
            />
          </FloatingField>
          <FloatingField className="filter-control">
            <span>Confirm Passphrase</span>
            <input
              id="login-confirm-passphrase"
              type="text"
              autoComplete="off"
              placeholder="Confirm passphrase"
            />
          </FloatingField>
        </div>
        <button
          className="action-button"
          id="login-submit-button"
          type="submit"
        >
          Continue
        </button>
        <p className="login-feedback" id="login-feedback" role="status" />
      </form>
    </>
  );
});

export const AccountSettingsPage = memo(function AccountSettingsPage() {
  return (
    <>
      <div className={`section-heading ${styles.modernPageHeading}`}>
        <p className="eyebrow">Preferences</p>
        <h1>Account Settings</h1>
        <p>
          Manage your followed teams, notifications, appearance, and offline
          images.
        </p>
      </div>
      <div className="account-settings-grid">
        <section
          className={`account-settings-card ${styles.settingsCard}`}
          aria-labelledby="appearance-settings-heading"
        >
          <div>
            <h2 id="appearance-settings-heading">Appearance</h2>
            <p>Switch between the dark and light site themes.</p>
          </div>
          <button
            className="theme-toggle"
            type="button"
            data-theme-toggle
            aria-pressed="true"
          >
            Dark
          </button>
        </section>
        <section
          className={`account-settings-card ${styles.settingsCard} ${styles.offlineCard}`}
          aria-labelledby="image-settings-heading"
        >
          <div>
            <h2 id="image-settings-heading">Offline</h2>
            <OfflineStatusNote />
          </div>
          <div className="image-cache-control">
            <button
              className="footer-copy-link"
              type="button"
              id="image-cache-toggle"
            >
              Save images
            </button>
            <button
              className="footer-copy-link"
              type="button"
              id="image-cache-purge"
            >
              Purge images
            </button>
            <span
              className="image-cache-status"
              id="image-cache-status"
              role="status"
              aria-live="polite"
            />
          </div>
        </section>
        <section
          className={`account-settings-card account-settings-card--stacked followed-teams-settings ${styles.settingsCard}`}
          id="followed-teams-settings"
          aria-labelledby="followed-teams-heading"
          hidden
        >
          <div className="followed-teams-heading-row">
            <div>
              <h2 id="followed-teams-heading">Followed Teams</h2>
              <p>
                Following a team enables match notifications about that team on
                devices where alerts are turned on.
              </p>
            </div>
            <span id="followed-teams-count">0 teams</span>
          </div>
          <div
            className="followed-teams-list"
            id="followed-teams-list"
            aria-live="polite"
          />
          <div className="followed-teams-actions">
            <button
              className="footer-copy-link"
              type="button"
              id="followed-teams-add"
            >
              Add teams
            </button>
            <button
              className="footer-copy-link"
              type="button"
              id="followed-teams-reset"
              hidden
            >
              Reset to default
            </button>
            <button
              className="action-button"
              type="button"
              id="followed-teams-save"
              disabled
            >
              Save teams
            </button>
          </div>
          <p
            className="followed-teams-status"
            id="followed-teams-status"
            role="status"
            aria-live="polite"
          />
        </section>
        <section
          className={`account-settings-card ${styles.settingsCard}`}
          aria-labelledby="version-settings-heading"
        >
          <div>
            <h2 id="version-settings-heading">About</h2>
            <p>Current Box This Lap site version.</p>
          </div>
          <span className="footer-version" id="site-version" />
        </section>
      </div>
    </>
  );
});

const helpFeatures = [
  {
    icon: CalendarDays,
    title: "Footy",
    location: "Footy in the main navigation",
    href: "#footy",
    description:
      "See upcoming and recent matches for the teams you follow. Open a team shortcut for its schedule, roster, and player details, or build a custom schedule from multiple teams.",
  },
  {
    icon: ListTodo,
    title: "Next",
    location: "Next in the main navigation",
    href: "#next",
    description:
      "Check the shared list of what is coming up next across the site, including dates and priority items intended for managers.",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "Rankings",
    location: "Rankings in the main navigation · login required",
    href: "#rankings",
    description:
      "Browse your game and movie rankings, compare snapshots, and use the head-to-head ranking flow to make choices.",
  },
  {
    icon: Trophy,
    title: "Leagues and competitions",
    location: "Leagues in the main navigation",
    href: "#leagues",
    description:
      "Open World Cup, Formula 1, Fantasy Critic, and Fantasy Office competitions. Each competition has its own tabs for entries, schedules, standings, or results when available.",
  },
  {
    icon: LayoutDashboard,
    title: "Manager Hub",
    location: "Profile menu → Manager Hub · login required",
    href: "#manager-hub",
    description:
      "Use your personal dashboard to find open tasks, submissions, drafts, results, and shortcuts that need your attention.",
  },
  {
    icon: Dumbbell,
    title: "Workouts",
    location: "Manager Hub → Workouts · login required",
    href: "#workouts",
    description:
      "Record workouts and review your recent activity and personal statistics from the Manager Hub.",
  },
  {
    icon: BookOpen,
    title: "Guides",
    location: "Profile menu → Guides · login required",
    href: "#guides",
    description:
      "Open the game guides shared with managers and track the information you need without leaving the site.",
  },
  {
    icon: Bell,
    title: "Followed teams and alerts",
    location: "Profile menu → Account Settings · login required",
    href: "#account-settings",
    description:
      "Choose the teams shown in your Footy shortcuts and turn on match alerts from the Footy page. Alerts apply to the device where you enable them.",
  },
  {
    icon: Settings,
    title: "Preferences and offline use",
    location: "Profile menu → Account Settings",
    href: "#account-settings",
    description:
      "Switch the site theme, save images for offline use, clear saved images, manage followed teams, and check the current site version.",
  },
] as const;

export const HelpPage = memo(function HelpPage() {
  return (
    <>
      <div
        className={`section-heading ${styles.modernPageHeading} ${styles.helpHeading}`}
      >
        <p className="eyebrow">Site guide</p>
        <h1>How can we help?</h1>
        <p>
          A quick map of the features available to managers and where to find
          them. Sign in to unlock the personal tools marked below.
        </p>
      </div>
      <div className={styles.helpGrid}>
        {helpFeatures.map(
          ({ description, href, icon: Icon, location, title }) => (
            <HelpFeatureCard href={href} key={title}>
              <span className={styles.helpFeatureIcon} aria-hidden="true">
                <Icon />
              </span>
              <span className={styles.helpFeatureCopy}>
                <strong>{title}</strong>
                <span className={styles.helpFeatureLocation}>{location}</span>
                <span>{description}</span>
              </span>
            </HelpFeatureCard>
          ),
        )}
      </div>
    </>
  );
});

function HelpFeatureCard({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <a
      className={styles.helpFeatureCard}
      href={href}
      data-page-link={href.slice(1)}
    >
      {children}
    </a>
  );
}

export const SiteFooter = memo(function SiteFooter() {
  const { isOnline } = useAppState();
  return (
    <>
      {isOnline && (
        <div className="view-counter">
          <img
            src="https://visitor-badge.laobi.icu/badge?page_id=wyattjones-wnc.boxthislap"
            alt="Site view count"
            decoding="async"
            loading="lazy"
          />
        </div>
      )}
      <div className={styles.footerActions}>
        <a
          className={styles.footerHelpLink}
          href="#help"
          data-page-link="help"
          aria-label="Help and frequently asked questions"
          title="Help"
        >
          <CircleHelp aria-hidden="true" />
        </a>
        <button
          className="footer-copy-link"
          type="button"
          id="copy-current-page-link"
          hidden
        >
          Copy URL
        </button>
      </div>
    </>
  );
});
