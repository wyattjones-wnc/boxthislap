const STATUS_OPTIONS = [
  ["new", "New"],
  ["saved", "Saved"],
  ["watched", "Watched"],
  ["all", "All"],
];
const SESSION_STORAGE_KEY = "boxThisLapYouTubeSession";

export function createYouTubeInboxController({ endpoint }) {
  const view = document.querySelector("#youtube-inbox-view");
  const state = {
    channel: "",
    channels: [],
    initialized: false,
    lastSyncAt: "",
    loading: false,
    needsAuth: false,
    playlists: [],
    status: "new",
    syncing: false,
    videos: [],
  };

  function renderPage() {
    if (!view) return;

    if (!state.initialized) {
      state.initialized = true;
      view.addEventListener("click", handleClick);
      view.addEventListener("change", handleChange);
      view.addEventListener("submit", handleSubmit);
    }

    render();
    if (!state.loading && !state.videos.length) {
      load();
    }
  }

  async function load() {
    if (!view || state.loading) return;
    state.loading = true;
    render();

    try {
      const query = new URLSearchParams({ limit: "100", status: state.status });
      if (state.channel) query.set("channel", state.channel);

      const [videoData, playlistData] = await Promise.all([
        request(`/api/videos?${query}`),
        request("/api/youtube/playlists"),
      ]);
      state.videos = Array.isArray(videoData.videos) ? videoData.videos : [];
      state.channels = Array.isArray(videoData.channels) ? videoData.channels : [];
      state.playlists = Array.isArray(playlistData.playlists) ? playlistData.playlists : [];
      state.lastSyncAt = videoData.lastSyncAt || "";
      state.error = "";
      state.needsAuth = false;
    } catch (error) {
      state.needsAuth = error.status === 401;
      state.error = state.needsAuth ? "" : error.message || "Unable to load the YouTube inbox.";
    } finally {
      state.loading = false;
      render();
    }
  }

  function render() {
    if (!view) return;

    const channelNames = state.channels.map((channel) => channel.name).filter(Boolean);
    const newCount = state.status === "new" ? state.videos.length : "";

    view.innerHTML = `
      <div class="section-heading page-heading-with-action footy-heading youtube-heading">
        <div>
          <p class="guides-eyebrow">Subscription inbox</p>
          <h1>YouTube${newCount !== "" ? ` <span class="youtube-count">${newCount} new</span>` : ""}</h1>
          <p class="guides-intro">Review new uploads and file the ones worth keeping.</p>
        </div>
        <div class="heading-actions">
          <button class="action-button" type="button" data-youtube-refresh${state.syncing ? " disabled" : ""}>
            ${state.syncing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>
      <div class="youtube-toolbar" aria-label="YouTube inbox filters">
        <div class="youtube-status-tabs" role="group" aria-label="Video status">
          ${STATUS_OPTIONS.map(([value, label]) => `<button type="button" data-youtube-status="${value}" class="${state.status === value ? "is-active" : ""}" aria-pressed="${state.status === value}">${label}</button>`).join("")}
        </div>
        <label class="youtube-channel-filter">
          <span>Channel</span>
          <select data-youtube-channel>
            <option value="">All channels</option>
            ${channelNames.map((name) => `<option value="${escapeAttribute(name)}"${state.channel === name ? " selected" : ""}>${escapeHtml(name)}</option>`).join("")}
          </select>
        </label>
      </div>
      ${renderBody()}
      ${state.lastSyncAt ? `<p class="youtube-sync-note">Last refreshed ${escapeHtml(formatRelativeDate(state.lastSyncAt))}</p>` : ""}
    `;
  }

  function renderBody() {
    if (state.loading) {
      return `<div class="youtube-loading-grid" aria-label="Loading YouTube inbox">${Array.from({ length: 3 }, () => `<span class="youtube-skeleton-card"></span>`).join("")}</div>`;
    }

    if (state.needsAuth) {
      return `
        <form class="youtube-state youtube-login-state" data-youtube-login>
          <span aria-hidden="true">&#128274;</span>
          <h2>Unlock YouTube inbox</h2>
          <p>Enter the private inbox passphrase. This browser will stay unlocked for 30 days.</p>
          <label class="youtube-login-field">
            <span>Passphrase</span>
            <input type="password" name="passphrase" autocomplete="current-password" required>
          </label>
          <button class="action-button" type="submit">Unlock</button>
          <p class="youtube-login-feedback" role="status"></p>
        </form>
      `;
    }

    if (state.error) {
      return `
        <div class="youtube-state youtube-error-state">
          <span aria-hidden="true">!</span>
          <h2>Inbox unavailable</h2>
          <p>${escapeHtml(state.error)}</p>
          <div class="youtube-state-actions">
            <button class="action-button" type="button" data-youtube-retry>Try Again</button>
            <a class="action-button" href="${escapeAttribute(endpoint)}" target="_blank" rel="noopener">Open secure API</a>
          </div>
        </div>
      `;
    }

    if (!state.videos.length) {
      return `
        <div class="youtube-state">
          <span aria-hidden="true">&#10003;</span>
          <h2>All caught up</h2>
          <p>No ${state.status === "all" ? "videos" : escapeHtml(state.status + " videos")} match these filters.</p>
        </div>
      `;
    }

    return `<div class="youtube-video-list">${state.videos.map(renderVideo).join("")}</div>`;
  }

  function renderVideo(video) {
    const videoId = escapeAttribute(video.youtubeVideoId);
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(video.youtubeVideoId)}`;
    const quickPlaylists = ["3New", "VW"].map((name) => ({
      name,
      playlist: state.playlists.find((playlist) => playlist.name.trim().toLowerCase() === name.toLowerCase()),
    })).filter((entry) => entry.playlist);
    const details = [formatDuration(video.durationSeconds), formatRelativeDate(video.publishedAt)].filter(Boolean).join(" \u00b7 ");

    return `
      <article class="youtube-video-card" data-youtube-video="${videoId}">
        <a class="youtube-thumbnail" href="${watchUrl}" target="_blank" rel="noopener" aria-label="Watch ${escapeAttribute(video.title)} on YouTube">
          ${video.thumbnailUrl ? `<img src="${escapeAttribute(video.thumbnailUrl)}" alt="" loading="lazy" decoding="async">` : `<span aria-hidden="true">&#9654;</span>`}
        </a>
        <div class="youtube-video-content">
          <div class="youtube-video-copy">
            <h2><a href="${watchUrl}" target="_blank" rel="noopener">${escapeHtml(video.title)}</a></h2>
            <p>${escapeHtml(video.channel?.name || "Unknown channel")}</p>
            <span>${escapeHtml(details)}</span>
          </div>
          <div class="youtube-video-actions">
            <a class="action-button" href="${watchUrl}" target="_blank" rel="noopener">Watch</a>
            ${quickPlaylists.map(({ name, playlist }) => `<button class="action-button youtube-quick-playlist-button" type="button" data-youtube-quick-save="${escapeAttribute(playlist.youtubePlaylistId)}">Save to ${escapeHtml(name)}</button>`).join("")}
            ${video.status === "new" ? `<button class="action-button" type="button" data-youtube-action="watched">Seen</button>` : ""}
            ${video.status === "new" ? `<button class="action-button youtube-seen-through-button" type="button" data-youtube-seen-through>Seen through here</button>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  async function handleClick(event) {
    const statusButton = event.target.closest("[data-youtube-status]");
    if (statusButton) {
      state.status = statusButton.dataset.youtubeStatus;
      state.videos = [];
      await load();
      return;
    }

    if (event.target.closest("[data-youtube-refresh]")) {
      await sync();
      return;
    }

    if (event.target.closest("[data-youtube-retry]")) {
      await load();
      return;
    }

    const card = event.target.closest("[data-youtube-video]");
    if (!card) return;

    const actionButton = event.target.closest("[data-youtube-action]");
    if (actionButton) {
      await updateStatus(card.dataset.youtubeVideo, actionButton.dataset.youtubeAction, actionButton);
      return;
    }

    const seenThroughButton = event.target.closest("[data-youtube-seen-through]");
    if (seenThroughButton) {
      await markSeenThrough(card.dataset.youtubeVideo, seenThroughButton);
      return;
    }

    const quickSaveButton = event.target.closest("[data-youtube-quick-save]");
    if (quickSaveButton) {
      await saveToPlaylist(card.dataset.youtubeVideo, quickSaveButton.dataset.youtubeQuickSave, quickSaveButton);
    }
  }

  async function handleChange(event) {
    if (!event.target.matches("[data-youtube-channel]")) return;
    state.channel = event.target.value;
    state.videos = [];
    await load();
  }

  async function handleSubmit(event) {
    if (!event.target.matches("[data-youtube-login]")) return;
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector("button[type='submit']");
    const feedback = form.querySelector(".youtube-login-feedback");
    const passphrase = new FormData(form).get("passphrase");
    setBusy(button, true);
    try {
      const response = await fetch(`${endpoint}/api/auth/login`, {
        body: JSON.stringify({ passphrase }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok || !data.token) throw new Error(data.error || "Unable to unlock the inbox.");
      localStorage.setItem(SESSION_STORAGE_KEY, data.token);
      state.needsAuth = false;
      state.videos = [];
      await load();
    } catch (error) {
      button.disabled = false;
      button.textContent = "Unlock";
      feedback.textContent = error.message || "Unable to unlock the inbox.";
    }
  }

  async function sync() {
    state.syncing = true;
    render();
    try {
      let hasMore = true;
      let batches = 0;
      while (hasMore && batches < 10) {
        const result = await request("/api/youtube/sync", { method: "POST" });
        hasMore = Boolean(result.hasMore);
        batches += 1;
      }
      state.videos = [];
      state.error = "";
    } catch (error) {
      state.error = error.message || "Unable to refresh YouTube uploads.";
    } finally {
      state.syncing = false;
      await load();
    }
  }

  async function updateStatus(videoId, status, button) {
    setBusy(button, true);
    try {
      await request(`/api/videos/${encodeURIComponent(videoId)}/status`, {
        body: JSON.stringify({ status }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      state.videos = state.status === "all"
        ? state.videos.map((video) => video.youtubeVideoId === videoId ? { ...video, status } : video)
        : state.videos.filter((video) => video.youtubeVideoId !== videoId);
      render();
    } catch (error) {
      state.error = error.message || "Unable to update the video.";
      render();
    }
  }

  async function saveToPlaylist(videoId, playlistId, button) {
    setBusy(button, true);
    try {
      await request(`/api/youtube/playlists/${encodeURIComponent(playlistId)}/videos`, {
        body: JSON.stringify({ videoId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      state.videos = state.status === "all"
        ? state.videos.map((video) => video.youtubeVideoId === videoId ? { ...video, status: "saved" } : video)
        : state.videos.filter((video) => video.youtubeVideoId !== videoId);
      render();
    } catch (error) {
      state.error = error.message || "Unable to save the video.";
      render();
    }
  }

  async function markSeenThrough(videoId, button) {
    setBusy(button, true);
    try {
      await request(`/api/videos/${encodeURIComponent(videoId)}/seen-through`, { method: "POST" });
      state.videos = [];
      await load();
    } catch (error) {
      state.error = error.message || "Unable to mark the videos as seen.";
      render();
    }
  }

  async function request(path, options = {}) {
    const token = localStorage.getItem(SESSION_STORAGE_KEY);
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${endpoint}${path}`, { ...options, headers });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : null;
    if (!response.ok) {
      const error = new Error(data?.error || `YouTube API request failed (${response.status}).`);
      error.status = response.status;
      if (response.status === 401) localStorage.removeItem(SESSION_STORAGE_KEY);
      throw error;
    }
    return data || {};
  }

  return { load, renderPage };
}

function setBusy(button, busy) {
  if (!button) return;
  button.disabled = busy;
  if (busy) button.textContent = "Working...";
}

function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return "";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainingSeconds = Math.floor(value % 60);
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatRelativeDate(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const seconds = Math.round((time - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, unitSeconds] of units) {
    if (Math.abs(seconds) >= unitSeconds || unit === "minute") {
      return formatter.format(Math.round(seconds / unitSeconds), unit);
    }
  }
  return formatter.format(seconds, "second");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
