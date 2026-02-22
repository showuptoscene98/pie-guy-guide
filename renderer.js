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
    lfg: "navLfg",
    "casino-daily": "navCasinoDaily",
    tips: "navTips",
    instructions: "navInstructions",
    about: "navAbout"
  };

  setActiveNav(navMap[name]);
}

// Default page on launch:
go("about");

// ——— Startup modal: character + server (shown via Connect on LFG page) ———
function setupStartupModal() {
  const modal = document.getElementById("startupModal");
  const characterInput = document.getElementById("startupCharacterName");
  const serverSelect = document.getElementById("startupServer");
  const errorEl = document.getElementById("startupModalError");
  const submitBtn = document.getElementById("startupSubmitBtn");
  const skipBtn = document.getElementById("startupSkipBtn");
  if (!modal) return;

  function hideModal() {
    modal.classList.add("hidden");
  }
  function hideError() {
    if (errorEl) {
      errorEl.classList.add("hidden");
      errorEl.textContent = "";
    }
  }
  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove("hidden");
    }
  }

  function showModal() {
    hideError();
    if (window.api && window.api.getLfgPlayerName && window.api.getLfgServer) {
      Promise.all([window.api.getLfgPlayerName(), window.api.getLfgServer()]).then(([name, server]) => {
        if (characterInput) characterInput.value = typeof name === "string" ? name : "";
        if (serverSelect) serverSelect.value = (typeof server === "string" && server.trim()) ? server.trim() : "1";
      }).catch(() => {});
    } else {
      if (characterInput) characterInput.value = "";
      if (serverSelect) serverSelect.value = "1";
    }
    modal.classList.remove("hidden");
  }

  window.showLfgConnectModal = showModal;

  function onContinue() {
    hideError();
    const name = (characterInput && characterInput.value || "").trim();
    const server = (serverSelect && serverSelect.value || "1").trim();
    if (!name) {
      showError("Please enter your character name.");
      return;
    }
    if (window.api) {
      if (window.api.setLfgPlayerName) window.api.setLfgPlayerName(name);
      if (window.api.setLfgServer) window.api.setLfgServer(server);
      if (window.api.setLfgStartupDismissed) window.api.setLfgStartupDismissed(false);
    }
    window.__lfgPlayerName = name;
    window.__lfgServer = server;
    hideModal();
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onContinue();
    });
  }
  if (characterInput && serverSelect) {
    characterInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); onContinue(); }
    });
    serverSelect.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); onContinue(); }
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideError();
      if (window.api && window.api.setLfgStartupDismissed) window.api.setLfgStartupDismissed(true);
      hideModal();
    });
  }

  document.addEventListener("keydown", function onEsc(e) {
    if (e.key !== "Escape") return;
    if (!modal || modal.classList.contains("hidden")) return;
    e.preventDefault();
    hideError();
    if (window.api && window.api.setLfgStartupDismissed) window.api.setLfgStartupDismissed(true);
    hideModal();
  });

  const connectBtn = document.getElementById("lfgConnectBtn");
  if (connectBtn) connectBtn.addEventListener("click", () => showModal());
}

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
  const lfgPlayerInput = document.getElementById("optionLfgPlayerName");
  const lfgServerInput = document.getElementById("optionLfgServerUrl");
  const lfgServerSelect = document.getElementById("optionLfgServer");
  if (!cogBtn || !dropdown || !anchorCheck || !window.api) return;

  function openDropdown() {
    dropdown.classList.remove("hidden");
    if (window.__refreshAuthUI) window.__refreshAuthUI();
    window.api.getOverlayAnchorPreference().then((v) => {
      anchorCheck.checked = !!v;
    });
    window.api.getLfgPlayerName().then((v) => {
      const s = (v || "").trim();
      if (lfgPlayerInput) lfgPlayerInput.value = s;
      window.__lfgPlayerName = s;
    });
    window.api.getLfgServerUrl().then((v) => {
      const s = (v || "").trim();
      if (lfgServerInput) lfgServerInput.value = s;
      window.__lfgBaseUrl = s;
    });
    window.api.getLfgServer().then((v) => {
      const s = (v || "").trim() || "1";
      if (lfgServerSelect) lfgServerSelect.value = s;
      window.__lfgServer = s;
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
  if (lfgPlayerInput) {
    const syncLfgPlayer = () => {
      const v = lfgPlayerInput.value.trim();
      window.api.setLfgPlayerName(v);
      window.__lfgPlayerName = v;
    };
    lfgPlayerInput.addEventListener("change", syncLfgPlayer);
    lfgPlayerInput.addEventListener("blur", syncLfgPlayer);
  }
  if (lfgServerInput) {
    const syncLfgServer = () => {
      const v = lfgServerInput.value.trim();
      window.api.setLfgServerUrl(v);
      window.__lfgBaseUrl = v;
    };
    lfgServerInput.addEventListener("change", syncLfgServer);
    lfgServerInput.addEventListener("blur", syncLfgServer);
  }
  if (lfgServerSelect) {
    lfgServerSelect.addEventListener("change", () => {
      const v = (lfgServerSelect.value || "1").trim();
      window.api.setLfgServer(v);
      window.__lfgServer = v;
      if (window.__saveProfileToSupabase) window.__saveProfileToSupabase();
    });
  }

  if (lfgPlayerInput) {
    lfgPlayerInput.addEventListener("change", () => { if (window.__saveProfileToSupabase) window.__saveProfileToSupabase(); });
    lfgPlayerInput.addEventListener("blur", () => { if (window.__saveProfileToSupabase) window.__saveProfileToSupabase(); });
  }
  if (lfgServerInput) {
    lfgServerInput.addEventListener("change", () => { if (window.__saveProfileToSupabase) window.__saveProfileToSupabase(); });
    lfgServerInput.addEventListener("blur", () => { if (window.__saveProfileToSupabase) window.__saveProfileToSupabase(); });
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

// ——— Supabase auth: account UI and profile sync (when config is present) ———
function setupSupabaseAuth(supabase) {
  const accountRow = document.getElementById("optionsAccountRow");
  const loggedOut = document.getElementById("authLoggedOut");
  const loggedIn = document.getElementById("authLoggedIn");
  const authUserName = document.getElementById("authUserName");
  const loginBtn = document.getElementById("authLoginBtn");
  const signOutBtn = document.getElementById("authSignOutBtn");
  const AUTH_CALLBACK_SCHEME = "pieguyguide://auth/callback";

  if (!accountRow || !window.api || !window.api.onAuthCallback) return;

  accountRow.style.display = "";

  function parseHashParams(hash) {
    const params = {};
    if (!hash || hash.charAt(0) === "#") hash = hash.slice(1);
    hash.split("&").forEach((pair) => {
      const i = pair.indexOf("=");
      if (i === -1) return;
      params[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1));
    });
    return params;
  }

  function refreshAuthUI() {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (loggedOut) loggedOut.style.display = session ? "none" : "";
      if (loggedIn) loggedIn.style.display = session ? "" : "none";
      if (authUserName) authUserName.textContent = session?.user?.user_metadata?.full_name || session?.user?.email || "Logged in";
      if (session) applyProfileToLocal();
    });
  }

  function applyProfileToLocal() {
    supabase.from("profiles").select("character_name, server, lfg_server_url").single()
      .then(({ data }) => {
        if (!data) return;
        if (data.character_name != null && window.api.setLfgPlayerName) {
          window.api.setLfgPlayerName(String(data.character_name || "").trim());
          window.__lfgPlayerName = String(data.character_name || "").trim();
        }
        if (data.server != null && window.api.setLfgServer) {
          const s = String(data.server || "1").trim() || "1";
          window.api.setLfgServer(s);
          window.__lfgServer = s;
        }
        if (data.lfg_server_url != null && window.api.setLfgServerUrl) {
          window.api.setLfgServerUrl(String(data.lfg_server_url || "").trim());
          window.__lfgBaseUrl = String(data.lfg_server_url || "").trim();
        }
        const playerInput = document.getElementById("optionLfgPlayerName");
        const serverSelect = document.getElementById("optionLfgServer");
        const serverUrlInput = document.getElementById("optionLfgServerUrl");
        if (playerInput) playerInput.value = (data.character_name || "").trim();
        if (serverSelect) serverSelect.value = (data.server || "1").trim() || "1";
        if (serverUrlInput) serverUrlInput.value = (data.lfg_server_url || "").trim();
      })
      .catch(() => {});
  }

  window.__refreshAuthUI = refreshAuthUI;
  window.__saveProfileToSupabase = function () {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user?.id) return;
      const playerInput = document.getElementById("optionLfgPlayerName");
      const serverSelect = document.getElementById("optionLfgServer");
      const serverUrlInput = document.getElementById("optionLfgServerUrl");
      const character_name = (playerInput && playerInput.value) ? String(playerInput.value).trim() : "";
      const server = (serverSelect && serverSelect.value) ? String(serverSelect.value).trim() || "1" : "1";
      const lfg_server_url = (serverUrlInput && serverUrlInput.value) ? String(serverUrlInput.value).trim() : "";
      supabase.from("profiles").upsert(
        { id: session.user.id, character_name, server, lfg_server_url, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      ).then(() => {}).catch(() => {});
    });
  };

  window.api.onAuthCallback((url) => {
    if (!url || url.indexOf(AUTH_CALLBACK_SCHEME) === -1) return;
    const hashStart = url.indexOf("#");
    const hash = hashStart >= 0 ? url.slice(hashStart) : "";
    const params = parseHashParams(hash);
    const access_token = params.access_token;
    const refresh_token = params.refresh_token;
    if (access_token) {
      supabase.auth.setSession({ access_token, refresh_token: refresh_token || "" }).then(() => {
        refreshAuthUI();
      }).catch(() => {});
    }
  });

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: AUTH_CALLBACK_SCHEME }
      }).then(({ data }) => {
        if (data?.url && window.api.authOpenExternal) window.api.authOpenExternal(data.url);
      }).catch(() => {});
    });
  }
  if (signOutBtn) {
    signOutBtn.addEventListener("click", () => {
      supabase.auth.signOut().then(() => refreshAuthUI());
    });
  }

  refreshAuthUI();
}
window.__setupSupabaseAuth = setupSupabaseAuth;

setupOpacitySlider();
setupOptionsUI();

// Current zone / dungeon selects (player location for overlay player icon) — populated from local maps/ and dungeons/
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
    const fillMapSelect = (entries) => {
      (entries || []).forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.value;
        opt.textContent = m.label;
        mapSelect.appendChild(opt);
      });
      window.api.getCurrentMapZone().then((v) => {
        if (v && (entries || []).some((m) => m.value === v)) mapSelect.value = v;
      });
    };
    if (window.api.getMapFiles) {
      window.api.getMapFiles().then(fillMapSelect);
    }
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
    const fillDungeonSelect = (entries) => {
      (entries || []).forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d.value;
        opt.textContent = d.label;
        dungeonSelect.appendChild(opt);
      });
      window.api.getCurrentDungeonZone().then((v) => {
        if (v && (entries || []).some((d) => d.value === v)) dungeonSelect.value = v;
      });
    };
    if (window.api.getDungeonFiles) {
      window.api.getDungeonFiles().then(fillDungeonSelect);
    }
    dungeonSelect.addEventListener("change", () => {
      window.api.setCurrentDungeonZone(dungeonSelect.value);
    });
  }
}

setupZoneSelects();

// ——— Boss Timer ———
const BOSS_TIMER_STORAGE_KEY = "pieguy-boss-timers";
const BOSS_TIMER_LIST = [
  { id: "serbule-crypt", name: "Serbule Crypt", defaultRespawnMinutes: 8 },
  { id: "goblin-dungeon", name: "Goblin Dungeon", defaultRespawnMinutes: 8 },
  { id: "kur-tower", name: "Kur Tower", defaultRespawnMinutes: 8 },
  { id: "wolf-cave", name: "Wolf Cave", defaultRespawnMinutes: 8 },
  { id: "myconian-cave", name: "Myconian Cave", defaultRespawnMinutes: 8 },
  { id: "world-eltibule", name: "World Boss (Eltibule)", defaultRespawnMinutes: 8 },
  { id: "world-gazluk", name: "World Boss (Gazluk)", defaultRespawnMinutes: 8 },
  { id: "other", name: "Other / Custom", defaultRespawnMinutes: 8 }
];
// Boss section: 5, 8, 14 minutes only; default 8
const RESPAWN_OPTIONS = [5, 8, 14];

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
    const respawnMin = RESPAWN_OPTIONS.includes(boss.defaultRespawnMinutes) ? boss.defaultRespawnMinutes : 8;
    const select = document.createElement("select");
    select.className = "boss-timer-respawn";
    select.title = "Respawn time (minutes)";
    RESPAWN_OPTIONS.forEach((min) => {
      const opt = document.createElement("option");
      opt.value = min;
      opt.textContent = `${min} min`;
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

// ——— Casino Daily (rotates 11pm CST: Winter Nexus → Yeti Caves → Wolf Caves → Dark Chapel) ———
const CASINO_DAILY_DUNGEONS = ["Winter Nexus", "Yeti Caves", "Wolf Caves", "Dark Chapel"];
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
  // Period 0 = Winter Nexus, then Yeti Caves, Wolf Caves, Dark Chapel (repeats)
  return period % 4;
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

// Leveling guide: "View map" / "View dungeon map" open overlay and switch to that zone
function setupLevelingMapLinks() {
  if (!window.api) return;
  document.querySelectorAll("#page-leveling .leveling-view-map-btn").forEach((btn) => {
    const mapZone = btn.getAttribute("data-map-zone");
    const dungeonZone = btn.getAttribute("data-dungeon-zone");
    btn.addEventListener("click", () => {
      if (mapZone) {
        window.api.setCurrentMapZone(mapZone);
        window.api.openMap();
      } else if (dungeonZone) {
        window.api.setCurrentDungeonZone(dungeonZone);
        window.api.openDungeon();
      }
    });
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

function setupTipsNpcSearch() {
  const input = document.getElementById("tipsNpcSearch");
  const areaList = document.getElementById("tipsAreaList");
  if (!input || !areaList) return;

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function runSearch() {
    const q = input.value.trim().toLowerCase();
    const detailsList = areaList.querySelectorAll(".tips-area-details");

    detailsList.forEach((details) => {
      const area = (details.getAttribute("data-area") || "").toLowerCase();
      const body = details.querySelector(".tips-area-body");
      if (!body) return;

      let original = body.getAttribute("data-original-html");
      if (original == null) {
        original = body.innerHTML;
        body.setAttribute("data-original-html", original);
      }

      if (!q) {
        details.classList.remove("tips-area-hidden");
        body.innerHTML = original;
        return;
      }

      const searchable = (area + " " + (body.textContent || "")).toLowerCase();
      if (searchable.indexOf(q) === -1) {
        details.classList.add("tips-area-hidden");
        return;
      }

      details.classList.remove("tips-area-hidden");
      const escaped = escapeRegex(q);
      try {
        body.innerHTML = original.replace(
          new RegExp(`(${escaped})`, "gi"),
          "<mark class=\"tips-search-highlight\">$1</mark>"
        );
      } catch (_) {
        body.innerHTML = original;
      }
    });
  }

  input.addEventListener("input", runSearch);
  input.addEventListener("search", runSearch);
}

// ——— LFG / Group finder ———
const LFG_DEFAULT_SERVER = "https://pie-guy-guide.onrender.com";
const LFG_TAGS = ["Casino Daily", "Grinding", "Unlocking Content", "Questing"];
const LFG_LANGUAGES = ["English", "Spanish", "Russian", "Portuguese"];

function setupLfgPage() {
  const listEl = document.getElementById("lfgPostsList");
  const loadingEl = document.getElementById("lfgLoading");
  const errorEl = document.getElementById("lfgError");
  const refreshBtn = document.getElementById("lfgRefreshBtn");
  const createBtn = document.getElementById("lfgCreateBtn");
  const titleInput = document.getElementById("lfgPostTitle");
  const slotsInput = document.getElementById("lfgPostSlots");
  const descriptionInput = document.getElementById("lfgPostDescription");
  const tagsListEl = document.getElementById("lfgPostTagsList");
  const languageSelect = document.getElementById("lfgPostLanguage");
  const filterTag = document.getElementById("lfgFilterTag");
  const filterLanguage = document.getElementById("lfgFilterLanguage");
  const serverTabs = document.querySelectorAll(".lfg-tab");

  if (!listEl || !window.api) return;

  if (tagsListEl) {
    LFG_TAGS.forEach((tag) => {
      const label = document.createElement("label");
      label.className = "lfg-tag-check";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = tag;
      cb.className = "lfg-tag-checkbox";
      label.appendChild(cb);
      label.appendChild(document.createTextNode(" " + tag));
      tagsListEl.appendChild(label);
    });
  }

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
    Array.from(listEl.children).forEach((c) => {
      if (c.id !== "lfgLoading" && c.id !== "lfgError") c.remove();
    });
  }

  function baseUrl() {
    const u = window.__lfgBaseUrl;
    return (typeof u === "string" && u.trim()) ? u.trim().replace(/\/$/, "") : LFG_DEFAULT_SERVER;
  }
  function myName() {
    const n = window.__lfgPlayerName;
    return typeof n === "string" ? n.trim() : "";
  }
  function currentServer() {
    const s = window.__lfgServer;
    return (typeof s === "string" && s.trim()) ? s.trim() : "1";
  }

  function apiFetch(path, opts) {
    const url = (baseUrl().replace(/\/$/, "") + path).trim();
    if (!url || url === path) return Promise.reject(new Error("Set LFG server URL in Options"));
    return fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(opts && opts.headers) } });
  }

  function parseJsonResponse(r, defaultErrorMsg) {
    return r.text().then((text) => {
      if (!r.ok) {
        let msg = defaultErrorMsg || r.statusText || "Request failed";
        try {
          const j = JSON.parse(text);
          if (j && typeof j.error === "string") msg = j.error;
        } catch (_) {
          if (text && text.trim()) msg = text.trim();
        }
        return Promise.reject(new Error(msg));
      }
      if (r.status === 204 || !text || !text.trim()) return null;
      try {
        return JSON.parse(text);
      } catch (_) {
        return Promise.reject(new Error("Invalid response from server"));
      }
    });
  }

  function loadPosts(showLoading) {
    if (showLoading) setLoading(true);
    const server = currentServer();
    let path = "/api/posts?server=" + encodeURIComponent(server);
    const tag = filterTag && filterTag.value ? filterTag.value.trim() : "";
    const lang = filterLanguage && filterLanguage.value ? filterLanguage.value.trim() : "";
    if (tag) path += "&tag=" + encodeURIComponent(tag);
    if (lang) path += "&language=" + encodeURIComponent(lang);
    apiFetch(path)
      .then((r) => parseJsonResponse(r, "Failed to load posts. Is the LFG server running?"))
      .then((posts) => {
        setLoading(false);
        clearList();
        if (!posts || posts.length === 0) {
          listEl.appendChild(Object.assign(document.createElement("p"), { className: "muted", textContent: "No posts yet. Create one above." }));
          return;
        }
        posts.forEach((post) => renderPost(post));
      })
      .catch((e) => {
        setError(e.message || "Failed to load posts. Is the LFG server running?");
      });
  }

  function getPostDetail(postId) {
    return apiFetch("/api/posts/" + postId)
      .then((r) => parseJsonResponse(r, "Failed to load post"));
  }

  function renderPost(post) {
    const isAuthor = myName() && post.authorName && post.authorName.toLowerCase() === myName().toLowerCase();
    const interestedCount = post.interestedCount ?? (post.interested ? post.interested.length : 0);
    const full = interestedCount >= post.slots;
    const list = post.interested || [];
    const amInterested = list.some((n) => n.toLowerCase() === myName().toLowerCase());

    const card = document.createElement("div");
    card.className = "lfg-post-card";
    card.dataset.postId = String(post.id);

    const head = document.createElement("div");
    head.className = "lfg-post-head";
    const title = document.createElement("span");
    title.className = "lfg-post-title";
    title.textContent = post.text || "Untitled";
    const meta = document.createElement("span");
    meta.className = "lfg-post-meta muted";
    const metaParts = ["by " + (post.authorName || "?"), interestedCount + "/" + post.slots + " slots"];
    if (post.language) metaParts.push(post.language);
    meta.textContent = metaParts.join(" · ");
    head.appendChild(title);
    head.appendChild(meta);
    card.appendChild(head);

    if (post.description && String(post.description).trim()) {
      const descEl = document.createElement("p");
      descEl.className = "lfg-post-description muted";
      descEl.textContent = post.description.trim();
      card.appendChild(descEl);
    }
    const postTags = post.tags;
    if (Array.isArray(postTags) && postTags.length > 0) {
      const tagsWrap = document.createElement("div");
      tagsWrap.className = "lfg-post-tags";
      postTags.forEach((t) => {
        if (!t) return;
        const pill = document.createElement("span");
        pill.className = "lfg-post-tag-pill";
        pill.textContent = String(t).trim();
        tagsWrap.appendChild(pill);
      });
      card.appendChild(tagsWrap);
    }

    if (isAuthor) {
      const interestedSection = document.createElement("div");
      interestedSection.className = "lfg-post-interested-section";
      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "lfg-post-toggle-btn";
      toggleBtn.textContent = "Interested (" + interestedCount + ")";
      const listDiv = document.createElement("div");
      listDiv.className = "lfg-post-interested-list hidden";
      listDiv.innerHTML = "";

      function refreshInterestedList() {
        getPostDetail(post.id).then((p) => {
          listDiv.innerHTML = "";
          (p.interested || []).forEach((playerName) => {
            const row = document.createElement("div");
            row.className = "lfg-interested-row";
            row.innerHTML = "<span class=\"lfg-interested-name\">" + escapeHtml(playerName) + "</span>";
            const inviteBtn = document.createElement("button");
            inviteBtn.type = "button";
            inviteBtn.className = "btn lfg-btn-small primary";
            inviteBtn.textContent = "Invite";
            inviteBtn.addEventListener("click", () => {
              window.api.copyToClipboard("/pinvite " + playerName);
              inviteBtn.textContent = "Copied!";
              setTimeout(() => { inviteBtn.textContent = "Invite"; }, 2000);
            });
            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "btn lfg-btn-small";
            removeBtn.textContent = "Remove";
            removeBtn.addEventListener("click", () => {
              removeInterest(post.id, playerName, post.authorName).then(() => {
                refreshInterestedList();
                loadPosts(false);
              });
            });
            row.appendChild(inviteBtn);
            row.appendChild(removeBtn);
            listDiv.appendChild(row);
          });
          if ((p.interested || []).length === 0) {
            const empty = document.createElement("p");
            empty.className = "muted";
            empty.textContent = "No one interested yet.";
            listDiv.appendChild(empty);
          }
          toggleBtn.textContent = "Interested (" + (p.interested || []).length + ")";
        });
      }

      toggleBtn.addEventListener("click", () => {
        const open = !listDiv.classList.contains("hidden");
        if (open) {
          listDiv.classList.add("hidden");
        } else {
          listDiv.classList.remove("hidden");
          refreshInterestedList();
        }
      });
      interestedSection.appendChild(toggleBtn);
      interestedSection.appendChild(listDiv);
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn lfg-btn-small lfg-delete-btn";
      deleteBtn.textContent = "Delete post";
      deleteBtn.addEventListener("click", () => {
        if (!confirm("Delete this post? This cannot be undone.")) return;
        deletePost(post.id).then(() => loadPosts(false)).catch((e) => setError(e.message || "Failed to delete"));
      });
      interestedSection.appendChild(deleteBtn);
      card.appendChild(interestedSection);
    } else {
      const actions = document.createElement("div");
      actions.className = "lfg-post-actions";
      if (amInterested) {
        const unBtn = document.createElement("button");
        unBtn.type = "button";
        unBtn.className = "btn lfg-btn-small";
        unBtn.textContent = "Uninterested";
        unBtn.addEventListener("click", () => {
          removeInterest(post.id, myName(), myName()).then(() => loadPosts(false));
        });
        actions.appendChild(unBtn);
      } else if (full) {
        const fullSpan = document.createElement("span");
        fullSpan.className = "muted";
        fullSpan.textContent = "Full";
        actions.appendChild(fullSpan);
      } else {
        const intBtn = document.createElement("button");
        intBtn.type = "button";
        intBtn.className = "btn lfg-btn-small primary";
        intBtn.textContent = "Interested";
        intBtn.addEventListener("click", () => {
          addInterest(post.id).then(() => {
            window.api.copyToClipboard("/tell " + (post.authorName || "").trim() + " I am interested in joining");
            intBtn.textContent = "Copied — paste in game";
            loadPosts(false);
            setTimeout(() => { intBtn.textContent = "Interested"; }, 2500);
          });
        });
        actions.appendChild(intBtn);
      }
      card.appendChild(actions);
    }

    // Comments section (all posts)
    const commentCount = post.commentCount ?? 0;
    const commentsSection = document.createElement("div");
    commentsSection.className = "lfg-comments-section";
    const commentsToggle = document.createElement("button");
    commentsToggle.type = "button";
    commentsToggle.className = "lfg-comments-toggle";
    commentsToggle.textContent = "Comments (" + commentCount + ")";
    const commentsListDiv = document.createElement("div");
    commentsListDiv.className = "lfg-comments-list hidden";
    const commentForm = document.createElement("div");
    commentForm.className = "lfg-comment-form";
    const commentInput = document.createElement("input");
    commentInput.type = "text";
    commentInput.className = "lfg-comment-input";
    commentInput.placeholder = "Add a comment…";
    const commentSubmit = document.createElement("button");
    commentSubmit.type = "button";
    commentSubmit.className = "primary lfg-comment-submit";
    commentSubmit.textContent = "Post";
    commentForm.appendChild(commentInput);
    commentForm.appendChild(commentSubmit);

    function refreshComments() {
      apiFetch("/api/posts/" + post.id + "/comments")
        .then((r) => r.text().then((text) => {
          if (!r.ok) return [];
          try { return (text && text.trim()) ? JSON.parse(text) : []; } catch (_) { return []; }
        }))
        .then((commentsList) => {
          const list = Array.isArray(commentsList) ? commentsList : [];
          commentsListDiv.innerHTML = "";
          list.forEach((c) => {
            const item = document.createElement("div");
            item.className = "lfg-comment-item";
            const meta = document.createElement("div");
            meta.className = "lfg-comment-meta";
            meta.textContent = (c.authorName || "?") + " · " + (c.createdAt ? new Date(c.createdAt).toLocaleString() : "");
            const text = document.createElement("div");
            text.className = "lfg-comment-text";
            text.textContent = c.text || "";
            item.appendChild(meta);
            item.appendChild(text);
            commentsListDiv.appendChild(item);
          });
          commentsListDiv.appendChild(commentForm);
          commentsToggle.textContent = "Comments (" + list.length + ")";
        })
        .catch(() => {
          commentsListDiv.innerHTML = "";
          commentsListDiv.appendChild(commentForm);
          commentsToggle.textContent = "Comments (0)";
        });
    }
    commentSubmit.addEventListener("click", () => {
      const text = (commentInput.value || "").trim();
      if (!text) return;
      const author = myName();
      if (!author) return;
      apiFetch("/api/posts/" + post.id + "/comments", {
        method: "POST",
        body: JSON.stringify({ authorName: author, text })
      })
        .then((r) => parseJsonResponse(r).then(() => { commentInput.value = ""; refreshComments(); }))
        .catch(() => {});
    });
    commentsToggle.addEventListener("click", () => {
      const open = !commentsListDiv.classList.contains("hidden");
      if (open) {
        commentsListDiv.classList.add("hidden");
      } else {
        commentsListDiv.classList.remove("hidden");
        refreshComments();
      }
    });
    commentsSection.appendChild(commentsToggle);
    commentsSection.appendChild(commentsListDiv);
    card.appendChild(commentsSection);

    listEl.appendChild(card);
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function addInterest(postId) {
    return apiFetch("/api/posts/" + postId + "/interested", {
      method: "POST",
      body: JSON.stringify({ playerName: myName() })
    }).then((r) => parseJsonResponse(r));
  }

  function removeInterest(postId, playerNameToRemove, requesterName) {
    return fetch((baseUrl().replace(/\/$/, "") + "/api/posts/" + postId + "/interested").trim(), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerNameToRemove, requesterName })
    }).then((r) => parseJsonResponse(r));
  }

  function deletePost(postId) {
    return apiFetch("/api/posts/" + postId, {
      method: "DELETE",
      body: JSON.stringify({ authorName: myName() })
    }).then((r) => {
      if (r.ok) return null;
      return parseJsonResponse(r, "Delete failed. Is the LFG server URL correct and the server running?");
    });
  }

  if (refreshBtn) refreshBtn.addEventListener("click", () => loadPosts(true));
  if (filterTag) filterTag.addEventListener("change", () => loadPosts(true));
  if (filterLanguage) filterLanguage.addEventListener("change", () => loadPosts(true));
  if (createBtn && titleInput && slotsInput) {
    createBtn.addEventListener("click", () => {
      const author = myName();
      if (!author) {
        setError("Set your in-game name in Options (gear) first.");
        return;
      }
      const text = (titleInput.value || "").trim();
      if (!text) {
        setError("Enter a post title.");
        return;
      }
      const description = descriptionInput ? (descriptionInput.value || "").trim() : "";
      const tags = tagsListEl ? Array.from(tagsListEl.querySelectorAll(".lfg-tag-checkbox:checked")).map((cb) => cb.value) : [];
      const language = languageSelect && languageSelect.value ? languageSelect.value.trim() : "English";
      const slots = Math.max(1, Math.min(20, parseInt(slotsInput.value, 10) || 4));
      const server = currentServer();
      setError("");
      apiFetch("/api/posts", {
        method: "POST",
        body: JSON.stringify({ authorName: author, text, description, tags, language, slots, server })
      })
        .then((r) => parseJsonResponse(r))
        .then(() => {
          titleInput.value = "";
          if (descriptionInput) descriptionInput.value = "";
          if (tagsListEl) tagsListEl.querySelectorAll(".lfg-tag-checkbox").forEach((cb) => { cb.checked = false; });
          if (languageSelect) languageSelect.value = "English";
          loadPosts(false);
        })
        .catch((e) => setError(e.message || "Failed to create post"));
    });
  }

  function initPrefs() {
    if (!window.api.getLfgServerUrl || !window.api.getLfgPlayerName) return;
    window.api.getLfgServerUrl().then((v) => { window.__lfgBaseUrl = (v || "").trim() || LFG_DEFAULT_SERVER; });
    window.api.getLfgPlayerName().then((v) => { window.__lfgPlayerName = (v || "").trim(); });
    window.api.getLfgServer().then((v) => { window.__lfgServer = (v || "").trim() || "1"; });
  }
  initPrefs();

  serverTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const server = (tab.getAttribute("data-server") || "1").trim();
      window.__lfgServer = server;
      if (window.api.setLfgServer) window.api.setLfgServer(server);
      serverTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      loadPosts(true);
    });
  });

  loadPosts(true);
}

// run after DOM loads
window.addEventListener("DOMContentLoaded", () => {
  setupStartupModal();
  setupLevelingAccordion();
  setupLevelingAreaDropdowns();
  setupLevelingMapLinks();
  setupTipsNpcSearch();
  setupUpdaterUI();
  setupPgNews();
  setupWikiSearch();
  setupLfgPage();
});
