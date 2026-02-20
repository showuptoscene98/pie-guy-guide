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
      summary.textContent = u.date;
      const bodyEl = document.createElement("div");
      bodyEl.className = "home-update-body";
      const rawBody = (u.body || "").trim();
      const paragraphs = rawBody ? rawBody.split(/\n\s*\n/).filter(Boolean) : [];
      if (paragraphs.length) {
        paragraphs.forEach((para) => {
          const trimmed = para.replace(/\s+/g, " ").trim();
          if (!trimmed) return;
          const segments = trimmed.split(/\s+-\s+/);
          segments.forEach((seg, i) => {
            const text = seg.trim();
            if (!text) return;
            const p = document.createElement("p");
            p.textContent = text;
            bodyEl.appendChild(p);
          });
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
  setupUpdaterUI();
  setupPgNews();
  setupWikiSearch();
});
