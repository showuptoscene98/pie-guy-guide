// Block right click and dragging images out of the app
window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("dragstart", (e) => e.preventDefault());

function setActiveNav(id) {
  document.querySelectorAll(".navBtn").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById(id);
  if (btn) btn.classList.add("active");
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = document.getElementById(pageId);
  if (page) page.classList.add("active");
}

function go(name) {
  showPage(`page-${name}`);

  const navMap = {
    home: "navHome",
    maps: "navMaps",
    dungeons: "navDungeons",
    leveling: "navLeveling",
    "boss-timer": "navBossTimer",
    "casino-daily": "navCasinoDaily",
    tips: "navTips",
    instructions: "navInstructions",
    about: "navAbout"
  };

  setActiveNav(navMap[name]);
}

// Default page on launch:
go("about");

// ——— Opacity slider (sidebar) ———
function setupOpacitySlider() {
  const slider = document.getElementById("opacitySlider");
  const valueEl = document.getElementById("opacityValue");
  const STORAGE_KEY = "pieguy-opacity";
  const defaultOpacity = 100;

  if (!slider || !valueEl || !window.api?.setWindowOpacity) return;

  function applyOpacity(percent) {
    const p = Math.min(100, Math.max(30, Number(percent)));
    slider.value = p;
    valueEl.textContent = p + "%";
    const ratio = p / 100;
    window.api.setWindowOpacity(ratio);
    try { localStorage.setItem(STORAGE_KEY, String(p)); } catch (_) {}
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  const initial = saved !== null ? Number(saved) : defaultOpacity;
  if (Number.isFinite(initial)) applyOpacity(initial);

  slider.addEventListener("input", () => applyOpacity(slider.value));
}

function setupOptionsUI() {
  const cogBtn = document.getElementById("optionsCogBtn");
  const dropdown = document.getElementById("optionsDropdown");
  const anchorCheck = document.getElementById("optionAnchorOverlays");
  const themeSelect = document.getElementById("optionTheme");
  if (!cogBtn || !dropdown || !anchorCheck || !window.api) return;

  function openDropdown() {
    dropdown.classList.remove("hidden");
    window.api.getOverlayAnchorPreference().then((v) => {
      anchorCheck.checked = !!v;
    });
  }

  function closeDropdown() {
    dropdown.classList.add("hidden");
  }

  cogBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dropdown.classList.contains("hidden")) openDropdown();
    else closeDropdown();
  });

  anchorCheck.addEventListener("change", () => {
    window.api.setOverlayAnchorPreference(anchorCheck.checked);
  });

  function applyTheme(theme) {
    const t = theme || "dark-red";
    document.body.setAttribute("data-theme", t);
    if (themeSelect) themeSelect.value = t;
  }
  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      const v = themeSelect.value;
      window.api.setTheme(v);
      applyTheme(v);
    });
  }

  document.addEventListener("click", (e) => {
    if (!dropdown.classList.contains("hidden") && !e.target.closest(".options-wrap")) closeDropdown();
  });

  window.api.getOverlayAnchorPreference().then((v) => {
    anchorCheck.checked = !!v;
  });
  window.api.getTheme().then((v) => {
    applyTheme(v);
  });
}

setupOpacitySlider();
setupOptionsUI();

// Current zone / dungeon selects (player location for overlay player icon)
const MAP_ZONES = [
  "AnagogeIsland", "Eltibule", "Fae Realm", "Gazluk", "Ilmari", "Kur Mountains",
  "Povus", "Rahu", "Serbule", "SerbuleHills", "Sun Vale"
];
const DUNGEON_ZONES = [
  "Goblin Dungeon Lower", "Goblin Dungeon Upper", "Kur Tower", "Rahu Sewer",
  "Serbule Crypt", "Wolf Cave", "Yeti Cave", "Myconian Cave", "Labyrinth Map", "Dark Chapel"
];

function setupZoneSelects() {
  const mapSelect = document.getElementById("currentMapZoneSelect");
  const dungeonSelect = document.getElementById("currentDungeonZoneSelect");
  if (!window.api) return;

  if (mapSelect) {
    mapSelect.innerHTML = "";
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "None";
    mapSelect.appendChild(none);
    MAP_ZONES.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      mapSelect.appendChild(opt);
    });
    window.api.getCurrentMapZone().then((v) => {
      if (v && MAP_ZONES.includes(v)) mapSelect.value = v;
    });
    mapSelect.addEventListener("change", () => {
      window.api.setCurrentMapZone(mapSelect.value);
    });
  }

  if (dungeonSelect) {
    dungeonSelect.innerHTML = "";
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "None";
    dungeonSelect.appendChild(none);
    DUNGEON_ZONES.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      dungeonSelect.appendChild(opt);
    });
    window.api.getCurrentDungeonZone().then((v) => {
      if (v && DUNGEON_ZONES.includes(v)) dungeonSelect.value = v;
    });
    dungeonSelect.addEventListener("change", () => {
      window.api.setCurrentDungeonZone(dungeonSelect.value);
    });
  }
}

setupZoneSelects();

// ——— Boss Timer ———
const BOSS_TIMER_STORAGE_KEY = "pieguy-boss-timers";
const BOSS_TIMER_LIST = [
  { id: "serbule-crypt", name: "Serbule Crypt", defaultRespawnMinutes: 5 },
  { id: "goblin-dungeon", name: "Goblin Dungeon", defaultRespawnMinutes: 5 },
  { id: "kur-tower", name: "Kur Tower", defaultRespawnMinutes: 5 },
  { id: "wolf-cave", name: "Wolf Cave", defaultRespawnMinutes: 5 },
  { id: "myconian-cave", name: "Myconian Cave", defaultRespawnMinutes: 5 },
  { id: "world-eltibule", name: "World Boss (Eltibule)", defaultRespawnMinutes: 5 },
  { id: "world-gazluk", name: "World Boss (Gazluk)", defaultRespawnMinutes: 5 },
  { id: "other", name: "Other / Custom", defaultRespawnMinutes: 5 }
];
const RESPAWN_OPTIONS = [5, 30, 60, 90, 120, 180, 240, 360];

function setupBossTimer() {
  const container = document.getElementById("bossTimerList");
  if (!container) return;

  function loadTimers() {
    try {
      const raw = localStorage.getItem(BOSS_TIMER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }
  function saveTimers(timers) {
    try {
      localStorage.setItem(BOSS_TIMER_STORAGE_KEY, JSON.stringify(timers));
    } catch (_) {}
  }

  function formatCountdown(ms) {
    if (ms <= 0) return "Available now";
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / 60000) % 60;
    const h = Math.floor(ms / 3600000);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  const timers = loadTimers();
  const rows = [];

  BOSS_TIMER_LIST.forEach((boss) => {
    const row = document.createElement("div");
    row.className = "boss-timer-row";
    row.dataset.bossId = boss.id;
    const respawnMin = RESPAWN_OPTIONS.includes(boss.defaultRespawnMinutes) ? boss.defaultRespawnMinutes : 5;
    const select = document.createElement("select");
    select.className = "boss-timer-respawn";
    select.title = "Respawn time (minutes)";
    RESPAWN_OPTIONS.forEach((min) => {
      const opt = document.createElement("option");
      opt.value = min;
      opt.textContent = min === 5 ? "5 min" : min === 60 ? "1 hour" : min === 120 ? "2 hours" : min === 180 ? "3 hours" : min === 240 ? "4 hours" : min === 360 ? "6 hours" : `${min} min`;
      select.appendChild(opt);
    });
    select.value = String(respawnMin);
    const label = document.createElement("span");
    label.className = "boss-timer-name";
    label.textContent = boss.name;
    const status = document.createElement("span");
    status.className = "boss-timer-status";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn boss-timer-btn";
    btn.textContent = "Killed";
    btn.addEventListener("click", () => {
      timers[boss.id] = Date.now();
      saveTimers(timers);
    });
    row.appendChild(label);
    row.appendChild(select);
    row.appendChild(status);
    row.appendChild(btn);
    container.appendChild(row);
    rows.push({ row, status, select, bossId: boss.id });
  });

  function tick() {
    const now = Date.now();
    rows.forEach(({ status, select, bossId }) => {
      const killedAt = timers[bossId];
      const respawnMs = Number(select.value) * 60 * 1000;
      if (!killedAt) {
        status.textContent = "—";
        status.classList.remove("available");
        return;
      }
      const elapsed = now - killedAt;
      const remaining = respawnMs - elapsed;
      if (remaining <= 0) {
        status.textContent = "Available now";
        status.classList.add("available");
      } else {
        status.textContent = "Respawns in " + formatCountdown(remaining);
        status.classList.remove("available");
      }
    });
  }
  tick();
  setInterval(tick, 1000);
}

setupBossTimer();

// ——— Casino Daily (rotates 11pm CST: Yeti Caves → Wolf Caves → Dark Chapel → Winter Nexus) ———
const CASINO_DAILY_DUNGEONS = ["Yeti Caves", "Wolf Caves", "Dark Chapel", "Winter Nexus"];
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// 11pm CST = 05:00 UTC next calendar day; current casino day starts at most recent 05:00 UTC

function getStartOfCurrentCasinoDay() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  let start = new Date(Date.UTC(y, m, d, 5, 0, 0, 0));
  if (start.getTime() > now.getTime()) start = new Date(Date.UTC(y, m, d - 1, 5, 0, 0, 0));
  return start.getTime();
}

function getCasinoDailyIndex() {
  const ref = getStartOfCurrentCasinoDay();
  const period = Math.floor((Date.now() - ref) / MS_PER_DAY);
  // Current period (0) = Dark Chapel (index 2), then Winter Nexus, Yeti Caves, Wolf Caves
  return ((2 + period) % 4 + 4) % 4;
}

function getNextCasinoDailyRotation() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const h = now.getUTCHours();
  // 11pm CST = 05:00 UTC next calendar day
  let next = new Date(Date.UTC(y, m, d, 5, 0, 0, 0));
  if (next.getTime() <= now.getTime()) next = new Date(Date.UTC(y, m, d + 1, 5, 0, 0, 0));
  return next;
}

function formatTimeUntil(ms) {
  if (ms <= 0) return "now";
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function updateCasinoDailyUI() {
  const dungeonEl = document.getElementById("casinoDailyDungeon");
  const nextEl = document.getElementById("casinoDailyNext");
  if (!dungeonEl) return;
  const index = getCasinoDailyIndex();
  dungeonEl.textContent = "Today: " + CASINO_DAILY_DUNGEONS[index];
  if (nextEl) {
    const next = getNextCasinoDailyRotation();
    const ms = next.getTime() - Date.now();
    nextEl.textContent = "Next rotation: " + formatTimeUntil(ms) + " (11pm CST)";
  }
}

function setupCasinoDaily() {
  updateCasinoDailyUI();
  setInterval(updateCasinoDailyUI, 1000);
}

setupCasinoDaily();

// Leveling accordion: only one bracket open at a time
function setupLevelingAccordion() {
  const container = document.querySelector("#page-leveling .leveling");
  if (!container) return;

  const all = Array.from(container.querySelectorAll("details.lvl"));

  all.forEach((d) => {
    d.addEventListener("toggle", () => {
      if (!d.open) return;
      all.forEach((other) => {
        if (other !== d) other.open = false;
      });
    });
  });
}

// Leveling area dropdowns: show the selected area content in each bracket
function setupLevelingAreaDropdowns() {
  document.querySelectorAll("#page-leveling .leveling-area-select").forEach((select) => {
    const body = select.closest(".lvlBody");
    if (!body) return;

    function showArea(value) {
      body.querySelectorAll(".leveling-area-content").forEach((el) => {
        el.classList.toggle("active", el.getAttribute("data-area") === value);
      });
    }

    showArea(select.value);
    select.addEventListener("change", () => showArea(select.value));
  });
}

// ——— Updater UI ———
function setupUpdaterUI() {
  const banner = document.getElementById("updateBanner");
  const bannerText = document.getElementById("updateBannerText");
  const restartBtn = document.getElementById("updateRestartBtn");
  const versionEl = document.getElementById("appVersion");
  const checkBtn = document.getElementById("checkUpdatesBtn");
  const modal = document.getElementById("updateModal");
  const modalTitle = document.getElementById("updateModalTitle");
  const modalText = document.getElementById("updateModalText");
  const modalLater = document.getElementById("updateModalLater");
  const modalRestart = document.getElementById("updateModalRestart");

  if (!window.api || !window.api.getAppVersion) return;

  window.api.getAppVersion().then((v) => {
    if (versionEl) versionEl.textContent = "v " + v;
  });

  function showBanner(text, showRestart) {
    if (!banner || !bannerText) return;
    banner.classList.remove("hidden");
    bannerText.textContent = text;
    if (restartBtn) restartBtn.style.display = showRestart ? "inline-block" : "none";
  }
  function hideBanner() {
    if (banner) banner.classList.add("hidden");
  }
  function showUpdateModal(title, text, showRestartBtn) {
    if (!modal || !modalTitle || !modalText) return;
    modalTitle.textContent = title;
    modalText.textContent = text;
    if (modalRestart) modalRestart.style.display = showRestartBtn ? "inline-block" : "none";
    modal.classList.remove("hidden");
  }
  function hideUpdateModal() {
    if (modal) modal.classList.add("hidden");
  }

  window.api.onUpdaterChecking(() => {
    if (checkBtn) checkBtn.disabled = true;
    if (banner) {
      banner.classList.remove("hidden");
      bannerText.textContent = "Checking for updates…";
      restartBtn.style.display = "none";
    }
  });
  window.api.onUpdaterUpdateAvailable((info) => {
    const ver = (info && info.version) ? info.version : "new version";
    showBanner("Update available: " + ver + ". Downloading…", false);
    showUpdateModal("Update available", "Version " + ver + " is available. Downloading in the background…", false);
    if (checkBtn) checkBtn.disabled = false;
  });
  window.api.onUpdaterUpdateNotAvailable(() => {
    showBanner("You're on the latest version.", false);
    if (checkBtn) checkBtn.disabled = false;
    setTimeout(hideBanner, 3000);
  });
  window.api.onUpdaterUpdateDownloaded((info) => {
    const ver = (info && info.version) ? info.version : "";
    showBanner("Update ready. Restart the app to install.", true);
    showUpdateModal("Update ready", "The new version has been downloaded. Restart the app to install.", true);
    if (modalText && ver) modalText.textContent = "Version " + ver + " is ready. Restart the app to install.";
    if (checkBtn) checkBtn.disabled = false;
  });
  window.api.onUpdaterError((err) => {
    showBanner("Update check failed: " + (err || "Unknown error"), false);
    if (checkBtn) checkBtn.disabled = false;
    hideUpdateModal();
  });

  if (modalLater) modalLater.addEventListener("click", hideUpdateModal);
  if (modalRestart) modalRestart.addEventListener("click", () => window.api.quitAndInstall());
  if (modal && modal.querySelector(".updateModal-backdrop")) {
    modal.querySelector(".updateModal-backdrop").addEventListener("click", hideUpdateModal);
  }

  if (checkBtn) {
    checkBtn.addEventListener("click", () => window.api.checkForUpdates());
  }
  if (restartBtn) {
    restartBtn.addEventListener("click", () => window.api.quitAndInstall());
  }
}

// ——— Project Gorgon news (Home) ———
function setupPgNews() {
  const listEl = document.getElementById("pgNewsList");
  const loadingEl = document.getElementById("pgNewsLoading");
  const errorEl = document.getElementById("pgNewsError");
  const refreshBtn = document.getElementById("pgNewsRefresh");

  function setLoading(loading) {
    if (loadingEl) loadingEl.classList.toggle("hidden", !loading);
    if (errorEl) errorEl.classList.add("hidden");
  }
  function setError(msg) {
    if (loadingEl) loadingEl.classList.add("hidden");
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove("hidden");
    }
  }
  function clearList() {
    if (!listEl) return;
    Array.from(listEl.children).forEach((c) => {
      if (c.id !== "pgNewsLoading" && c.id !== "pgNewsError") c.remove();
    });
  }
  function render(updates) {
    if (loadingEl) loadingEl.classList.add("hidden");
    if (errorEl) errorEl.classList.add("hidden");
    clearList();
    if (!updates || updates.length === 0) {
      listEl.appendChild(Object.assign(document.createElement("p"), { className: "muted", textContent: "No update notes found." }));
      return;
    }
    updates.forEach((u) => {
      const details = document.createElement("details");
      details.className = "home-update-item";
      const summary = document.createElement("summary");
      summary.textContent = "Patch notes · " + (u.date || "Unknown date");
      const bodyEl = document.createElement("div");
      bodyEl.className = "home-update-body";
      const rawBody = (u.body || "").trim();
      const paragraphs = rawBody ? rawBody.split(/\n\s*\n/).filter(Boolean) : [];
      if (paragraphs.length) {
        paragraphs.forEach((para) => {
          const trimmed = para.replace(/\s+/g, " ").trim();
          if (!trimmed) return;
          const bulletLike = trimmed.split(/\s+-\s+/);
          const isList = bulletLike.length > 1 && bulletLike.every((s) => s.length < 200);
          if (isList) {
            const ul = document.createElement("ul");
            bulletLike.forEach((seg) => {
              const text = seg.trim();
              if (!text) return;
              const li = document.createElement("li");
              li.textContent = text;
              ul.appendChild(li);
            });
            bodyEl.appendChild(ul);
          } else {
            const p = document.createElement("p");
            p.textContent = trimmed;
            bodyEl.appendChild(p);
          }
        });
      }
      details.appendChild(summary);
      details.appendChild(bodyEl);
      listEl.appendChild(details);
    });
  }

  function load(showLoading) {
    if (!window.api || !window.api.fetchProjectGorgonNews) {
      setError("News not available.");
      return;
    }
    if (showLoading) setLoading(true);
    window.api.fetchProjectGorgonNews().then(({ updates, error }) => {
      if (error) setError(error);
      else render(updates);
    });
  }

  if (refreshBtn) refreshBtn.addEventListener("click", () => load(true));
  load(false);
}

// ——— Project Gorgon Wiki search (topbar) ———
function setupWikiSearch() {
  const wrap = document.getElementById("wikiSearchWrap");
  const input = document.getElementById("wikiSearchInput");
  const resultsEl = document.getElementById("wikiSearchResults");

  if (!wrap || !input || !resultsEl || !window.api?.searchWiki) return;

  let debounceTimer = null;
  const DEBOUNCE_MS = 280;

  function hideResults() {
    resultsEl.classList.add("hidden");
    resultsEl.innerHTML = "";
  }

  function showResults(items, error) {
    resultsEl.innerHTML = "";
    resultsEl.classList.remove("hidden");
    if (error) {
      const p = document.createElement("p");
      p.className = "topbar-search-msg topbar-search-error";
      p.textContent = error;
      resultsEl.appendChild(p);
      return;
    }
    if (!items || items.length === 0) {
      const p = document.createElement("p");
      p.className = "topbar-search-msg muted";
      p.textContent = "No results. Try different words.";
      resultsEl.appendChild(p);
      return;
    }
    items.forEach((item) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "topbar-search-item";
      row.innerHTML = `<span class="topbar-search-item-title">${escapeHtml(item.title)}</span><span class="topbar-search-item-snippet">${escapeHtml(item.snippet)}</span>`;
      row.addEventListener("click", () => {
        if (window.api.openWikiPage) window.api.openWikiPage(item.url);
        input.value = "";
        hideResults();
      });
      resultsEl.appendChild(row);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function runSearch() {
    const q = (input.value || "").trim();
    if (!q) {
      hideResults();
      return;
    }
    window.api.searchWiki(q).then(({ results, error }) => {
      showResults(results, error);
    });
  }

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const q = (input.value || "").trim();
    if (!q) {
      hideResults();
      return;
    }
    debounceTimer = setTimeout(runSearch, DEBOUNCE_MS);
  });

  input.addEventListener("focus", () => {
    const q = (input.value || "").trim();
    if (q) runSearch();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideResults();
      input.blur();
    }
  });

  document.addEventListener("click", (e) => {
    if (wrap && !wrap.contains(e.target)) hideResults();
  });
}

// run after DOM loads
window.addEventListener("DOMContentLoaded", () => {
  setupLevelingAccordion();
  setupLevelingAreaDropdowns();
  setupUpdaterUI();
  setupPgNews();
  setupWikiSearch();
});
