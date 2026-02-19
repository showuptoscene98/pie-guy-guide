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
    tips: "navTips",
    about: "navAbout"
  };

  setActiveNav(navMap[name]);
}

// Default page on launch:
go("about");
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

// ——— Updater UI ———
function setupUpdaterUI() {
  const banner = document.getElementById("updateBanner");
  const bannerText = document.getElementById("updateBannerText");
  const restartBtn = document.getElementById("updateRestartBtn");
  const versionEl = document.getElementById("appVersion");
  const checkBtn = document.getElementById("checkUpdatesBtn");

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
    if (checkBtn) checkBtn.disabled = false;
  });
  window.api.onUpdaterUpdateNotAvailable(() => {
    hideBanner();
    if (checkBtn) checkBtn.disabled = false;
  });
  window.api.onUpdaterUpdateDownloaded(() => {
    showBanner("Update ready. Restart the app to install.", true);
    if (checkBtn) checkBtn.disabled = false;
  });
  window.api.onUpdaterError((err) => {
    showBanner("Update check failed: " + (err || "Unknown error"), false);
    if (checkBtn) checkBtn.disabled = false;
  });

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
      summary.textContent = u.date;
      const body = document.createElement("div");
      body.className = "home-update-body";
      body.style.whiteSpace = "pre-wrap";
      body.textContent = u.body;
      details.appendChild(summary);
      details.appendChild(body);
      listEl.appendChild(details);
    });
  }

  function load() {
    if (!window.api || !window.api.fetchProjectGorgonNews) {
      setError("News not available.");
      return;
    }
    setLoading(true);
    window.api.fetchProjectGorgonNews().then(({ updates, error }) => {
      if (error) setError(error);
      else render(updates);
    });
  }

  if (refreshBtn) refreshBtn.addEventListener("click", load);
  load();
}

// run after DOM loads
window.addEventListener("DOMContentLoaded", () => {
  setupLevelingAccordion();
  setupUpdaterUI();
  setupPgNews();
});
