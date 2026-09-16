import { memo } from "react";
import styles from "./Shell.module.css";

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
        <label className="select-control">
          <span>Manager</span>
          <select id="login-manager-select" defaultValue="">
            <option value="">Loading managers...</option>
          </select>
        </label>
        <label className="filter-control" id="login-passphrase-group">
          <span>Passphrase</span>
          <input
            id="login-passphrase"
            type="text"
            autoComplete="off"
            placeholder="Passphrase"
          />
        </label>
        <div className="login-setup-panel" id="login-recovery-panel" hidden>
          <p className="login-recovery-question" id="login-recovery-question" />
          <label className="filter-control">
            <span>Recovery Answer</span>
            <input
              id="login-recovery-answer"
              type="text"
              autoComplete="off"
              placeholder="Answer"
            />
          </label>
        </div>
        <div
          className="login-setup-panel"
          id="login-new-passphrase-panel"
          hidden
        >
          <label className="filter-control">
            <span>New Passphrase</span>
            <input
              id="login-new-passphrase"
              type="text"
              autoComplete="off"
              placeholder="New passphrase"
            />
          </label>
          <label className="filter-control">
            <span>Confirm Passphrase</span>
            <input
              id="login-confirm-passphrase"
              type="text"
              autoComplete="off"
              placeholder="Confirm passphrase"
            />
          </label>
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
          className={`account-settings-card account-settings-card--stacked ${styles.settingsCard}`}
          aria-labelledby="image-settings-heading"
        >
          <div>
            <h2 id="image-settings-heading">Offline Images</h2>
            <p>
              Save site images for offline use or remove images already saved on
              this device.
            </p>
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

export const SiteFooter = memo(function SiteFooter() {
  return (
    <>
      <div className="view-counter">
        <img
          src="https://visitor-badge.laobi.icu/badge?page_id=wyattjones-wnc.boxthislap"
          alt="Site view count"
          decoding="async"
          loading="lazy"
        />
      </div>
      <button
        className="footer-copy-link"
        type="button"
        id="copy-current-page-link"
        hidden
      >
        Copy URL
      </button>
    </>
  );
});
