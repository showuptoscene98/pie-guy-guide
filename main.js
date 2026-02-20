const { app, BrowserWindow, ipcMain, globalShortcut, Tray, nativeImage, Menu, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const { autoUpdater } = require("electron-updater");

// Force cache and userData to a writable location (avoids "Unable to move the cache" / "Access is denied" when run from Program Files or restricted paths)
const appData = app.getPath("appData");
const appName = "Pie Guy Guide";
app.setPath("userData", path.join(appData, appName));
app.setPath("cache", path.join(appData, appName, "Cache"));

const PG_NEWS_URL = "https://cdn.projectgorgon.com/news.txt";
const PG_NEWS_MAX_ITEMS = 6;

function fetchProjectGorgonNews() {
  return new Promise((resolve) => {
    const req = https.get(PG_NEWS_URL, { timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) {
        resolve({ error: "Failed to load news", updates: [] });
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try {
          const raw = Buffer.concat(chunks).toString("utf8");
          const updates = parsePgNews(raw);
          resolve({ updates, error: null });
        } catch (e) {
          resolve({ error: e.message || "Parse error", updates: [] });
        }
      });
    });
    req.on("error", (e) => resolve({ error: e.message || "Network error", updates: [] }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ error: "Request timed out", updates: [] });
    });
  });
}

function parsePgNews(raw) {
  const updates = [];
  const blocks = raw.split(/\s+Update Notes:\s*/i).filter(Boolean);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const firstNewline = trimmed.indexOf("\n");
    const dateLine = firstNewline === -1 ? trimmed : trimmed.slice(0, firstNewline);
    let body = firstNewline === -1 ? "" : trimmed.slice(firstNewline + 1).trim();
    // Preserve paragraph boundaries before collapsing whitespace (renderer splits on \n\n)
    const PARA = "\x00PARA\x00";
    body = body
      .replace(/<\/p>\s*/gi, PARA)
      .replace(/<br\s*\/?>\s*/gi, PARA)
      .replace(/\n\s*\n/g, PARA);
    body = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    body = body.split(PARA).join("\n\n").replace(/(\n\n)+/g, "\n\n").trim();
    const date = dateLine.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (date && date.length < 80) updates.push({ date, body });
  }
  return updates.slice(0, PG_NEWS_MAX_ITEMS);
}

let windowManager;
try {
  windowManager = require("node-window-manager").windowManager;
} catch (_) {
  windowManager = null;
}

const GAME_WINDOW_TITLE = "Project Gorgon";
const GAME_PROCESS_EXE = "WindowsPlayer.exe";
const ANCHOR_OFFSET_PX = 12;
const ANCHOR_POLL_MS = 400;

let mainWindow = null;
let appTray = null;
let mapWindow = null;
let dungeonWindow = null;
let mapClickthrough = false;
let dungeonClickthrough = false;
let wikiWindow = null;
let currentOpacity = 1;
let overlayAnchorTopRight = true;

const PREFERENCES_PATH = path.join(app.getPath("userData"), "preferences.json");

function loadPreferences() {
  try {
    const raw = fs.readFileSync(PREFERENCES_PATH, "utf8");
    const prefs = JSON.parse(raw);
    if (typeof prefs.overlayAnchorTopRight === "boolean") overlayAnchorTopRight = prefs.overlayAnchorTopRight;
  } catch (_) {}
}

function savePreferences() {
  try {
    fs.writeFileSync(PREFERENCES_PATH, JSON.stringify({ overlayAnchorTopRight }), "utf8");
  } catch (_) {}
}

function isGameWindow(w) {
  if (!w || typeof w.getTitle !== "function" || typeof w.getBounds !== "function") return false;
  const title = (w.getTitle() || "").trim();
  if (title !== GAME_WINDOW_TITLE) return false;
  if (w.isVisible && !w.isVisible()) return false;
  if (GAME_PROCESS_EXE && w.path) {
    const exe = typeof w.path === "string" ? w.path : "";
    if (!exe.toLowerCase().endsWith(GAME_PROCESS_EXE.toLowerCase())) return false;
  }
  return true;
}

function getGameWindowBounds() {
  if (!windowManager || typeof windowManager.getWindows !== "function") return null;
  try {
    const windows = windowManager.getWindows();
    for (const w of windows) {
      if (!isGameWindow(w)) continue;
      const b = w.getBounds();
      if (b && typeof b.x === "number" && typeof b.width === "number") return b;
      break;
    }
  } catch (_) {}
  return null;
}

/** Position overlay at top-right of primary display work area */
function positionOverlayTopRight(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const primary = screen.getPrimaryDisplay();
    const work = primary.workArea ?? primary.bounds;
    const [w, h] = win.getSize();
    const x = Math.round(work.x + work.width - w - ANCHOR_OFFSET_PX);
    const y = Math.round(work.y + ANCHOR_OFFSET_PX);
    win.setPosition(x, y);
  } catch (_) {}
}

function startAnchoredToGame(win) {
  try {
    const apply = () => {
      if (win.isDestroyed()) return;
      try {
        const game = getGameWindowBounds();
        const [w, h] = win.getSize();
        if (game) {
          const x = Math.round(game.x + game.width - w - ANCHOR_OFFSET_PX);
          const y = Math.round(game.y + ANCHOR_OFFSET_PX);
          win.setPosition(x, y);
        } else {
          positionOverlayTopRight(win);
        }
      } catch (_) {}
    };

    win.once("show", () => {
      try {
        apply();
        if (!getGameWindowBounds()) positionOverlayTopRight(win);
        win._anchorInterval = setInterval(apply, ANCHOR_POLL_MS);
      } catch (_) {
        positionOverlayTopRight(win);
      }
    });
    win.on("closed", () => {
      if (win._anchorInterval) clearInterval(win._anchorInterval);
    });
  } catch (_) {}
}

const OVERLAY_TITLEBAR_H = 64;
const OVERLAY_MIN_W = 320;
const OVERLAY_MIN_H = 240;
const OVERLAY_DEFAULT_W = 640;
const OVERLAY_DEFAULT_H = 480;

function createOverlayWindow(file) {
  const width = OVERLAY_DEFAULT_W;
  const height = OVERLAY_DEFAULT_H + OVERLAY_TITLEBAR_H;
  const opts = {
    width,
    height,
    minWidth: OVERLAY_MIN_W,
    minHeight: OVERLAY_MIN_H + OVERLAY_TITLEBAR_H,
    frame: false,
    thickFrame: false,
    show: true,
    backgroundColor: "#111111",
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  };
  if (overlayAnchorTopRight) {
    try {
      const primary = screen.getPrimaryDisplay();
      const work = primary.workArea ?? primary.bounds;
      opts.x = Math.round(work.x + work.width - width - ANCHOR_OFFSET_PX);
      opts.y = Math.round(work.y + ANCHOR_OFFSET_PX);
    } catch (_) {
      opts.x = 0;
      opts.y = 0;
    }
  } else {
    opts.center = true;
  }
  const win = new BrowserWindow(opts);

  win.setAlwaysOnTop(true, "screen-saver");

  if (overlayAnchorTopRight) {
    if (windowManager) {
      startAnchoredToGame(win);
    } else {
      win.once("show", () => positionOverlayTopRight(win));
    }
  }
  const filePath = path.isAbsolute(file) ? file : path.join(__dirname, file);
  win.setOpacity(currentOpacity);

  win.loadFile(filePath).catch(() => {}).finally(() => {
    if (!win.isDestroyed()) {
      win.show();
      win.focus();
    }
  });
  return win;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    thickFrame: false,
    backgroundColor: "#1a1a1a",
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setAlwaysOnTop(true, "screen-saver");

  mainWindow.loadFile("index.html");
  mainWindow.on("closed", () => {
    if (appTray && !appTray.isDestroyed()) {
      appTray.destroy();
      appTray = null;
    }
    mainWindow = null;
  });

  createTray();
}

function createTray() {
  if (appTray) return;
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "assets", "icon.png")
    : path.join(__dirname, "assets", "icon.png");
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    icon = nativeImage.createFromDataURL(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHklEQVQ4T2NkYGD4z0ABYBw1gGE0DBiGQRgwEpMBABPwAfG6k0g1AAAAAElFTkSuQmCC"
    );
  }
  if (icon.isEmpty()) return;
  appTray = new Tray(icon.resize({ width: 16, height: 16 }));
  appTray.setToolTip("Pie Guy Guide");
  appTray.on("click", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  appTray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show", click: () => mainWindow && !mainWindow.isDestroyed() && (mainWindow.show(), mainWindow.focus()) },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() }
    ])
  );
}

function minimizeMainToTray() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
}

function restoreMainIfMinimized() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
    mainWindow.focus();
  } else if (!mainWindow.isVisible()) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  // Allow pre-release so updates show even if a release is marked Pre-release on GitHub (GitHub /releases/latest ignores those)
  autoUpdater.allowPrerelease = true;
  autoUpdater.channel = "latest";

  const sendStatus = (channel, ...args) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args);
    }
  };

  autoUpdater.on("checking-for-update", () => sendStatus("updater:checking"));
  autoUpdater.on("update-available", (info) => sendStatus("updater:update-available", info));
  autoUpdater.on("update-not-available", (info) => sendStatus("updater:update-not-available", info));
  autoUpdater.on("download-progress", (progress) => sendStatus("updater:download-progress", progress));
  autoUpdater.on("update-downloaded", (info) => sendStatus("updater:update-downloaded", info));
  autoUpdater.on("error", (err) => {
    console.error("[updater]", err.message || err);
    sendStatus("updater:error", err.message || String(err));
  });

  // Auto-check shortly after app ready
  setTimeout(() => autoUpdater.checkForUpdates(), 3000);
}

app.whenReady().then(() => {
  loadPreferences();
  createMainWindow();
  setupAutoUpdater();

  // Hotkey: F7 minimize to tray / restore
  globalShortcut.register("F7", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
      mainWindow.focus();
    } else if (mainWindow.isVisible()) {
      minimizeMainToTray();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Hotkey: F8 toggle overlay click-through (map or dungeon, whichever is open)
  globalShortcut.register("F8", () => {
    if (mapWindow && !mapWindow.isDestroyed() && mapWindow.isVisible()) {
      mapClickthrough = !mapClickthrough;
      setOverlayClickthrough(mapWindow, mapClickthrough);
      return;
    }
    if (dungeonWindow && !dungeonWindow.isDestroyed() && dungeonWindow.isVisible()) {
      dungeonClickthrough = !dungeonClickthrough;
      setOverlayClickthrough(dungeonWindow, dungeonClickthrough);
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Main controls
ipcMain.on("main:minimize", () => {
  minimizeMainToTray();
});
ipcMain.on("main:setOpacity", (event, value) => {
  const opacity = Math.min(1, Math.max(0.2, Number(value)));
  currentOpacity = opacity;
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setOpacity(opacity);
  if (mapWindow && !mapWindow.isDestroyed()) mapWindow.setOpacity(opacity);
  if (dungeonWindow && !dungeonWindow.isDestroyed()) dungeonWindow.setOpacity(opacity);
});
ipcMain.on("main:close", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  } else {
    app.quit();
  }
});

// Map overlay: minimize main until map closes
ipcMain.on("overlay:openMap", () => {
  try {
    if (mapWindow && !mapWindow.isDestroyed()) {
      mapWindow.show();
      mapWindow.focus();
      return;
    }

    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) minimizeMainToTray();

    mapWindow = createOverlayWindow("map.html");
    mapWindow.on("closed", () => {
      mapWindow = null;
      mapClickthrough = false;
      restoreMainIfMinimized();
    });
  } catch (e) {
    console.error("overlay:openMap", e);
  }
});

// Dungeon overlay: same behavior
ipcMain.on("overlay:openDungeon", () => {
  try {
    if (dungeonWindow && !dungeonWindow.isDestroyed()) {
      dungeonWindow.show();
      dungeonWindow.focus();
      return;
    }

    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) minimizeMainToTray();

    dungeonWindow = createOverlayWindow("dungeon.html");
    dungeonWindow.on("closed", () => {
      dungeonWindow = null;
      dungeonClickthrough = false;
      restoreMainIfMinimized();
    });
  } catch (e) {
    console.error("overlay:openDungeon", e);
  }
});

// Close overlay (ESC)
ipcMain.on("overlay:close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.close();
});

ipcMain.on("overlay:setSize", (event, contentWidth, contentHeight) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;
  let maxW = 1920, maxH = 1200;
  try {
    const work = screen.getPrimaryDisplay().workArea ?? screen.getPrimaryDisplay().bounds;
    maxW = work.width;
    maxH = work.height;
  } catch (_) {}
  const w = Math.max(OVERLAY_MIN_W, Math.min(Math.round(Number(contentWidth) || OVERLAY_DEFAULT_W), maxW));
  const h = Math.max(OVERLAY_MIN_H + OVERLAY_TITLEBAR_H, Math.min(Math.round(Number(contentHeight) || OVERLAY_DEFAULT_H) + OVERLAY_TITLEBAR_H, maxH));
  win.setSize(w, h);
  if (overlayAnchorTopRight) positionOverlayTopRight(win);
});

ipcMain.on("overlay:setOpacity", (event, value) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;
  const opacity = Math.min(1, Math.max(0.2, Number(value)));
  win.setOpacity(opacity);
});

function setOverlayClickthrough(win, enabled) {
  if (!win || win.isDestroyed()) return;
  win.setIgnoreMouseEvents(enabled, { forward: true });
  win.webContents.send("overlay:clickthroughState", enabled);
}

ipcMain.handle("overlay:getAnchorPreference", () => overlayAnchorTopRight);
ipcMain.on("overlay:setAnchorPreference", (event, value) => {
  overlayAnchorTopRight = !!value;
  savePreferences();
});

ipcMain.on("overlay:setClickthrough", (event, enabled) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const on = Boolean(enabled);
  if (win === mapWindow) {
    mapClickthrough = on;
    setOverlayClickthrough(mapWindow, on);
  } else if (win === dungeonWindow) {
    dungeonClickthrough = on;
    setOverlayClickthrough(dungeonWindow, on);
  }
});

// Updater
ipcMain.on("updater:check", () => {
  if (app.isPackaged && autoUpdater) autoUpdater.checkForUpdates();
});
ipcMain.on("updater:quitAndInstall", () => {
  if (app.isPackaged) {
    try {
      autoUpdater.quitAndInstall(false, true);
    } catch (_) {
      app.quit();
    }
  } else {
    app.quit();
  }
});
ipcMain.handle("updater:getVersion", () => app.getVersion());

// Project Gorgon news (Home screen)
ipcMain.handle("pg-news:fetch", () => fetchProjectGorgonNews());

// Project Gorgon Wiki search (MediaWiki API)
const WIKI_API = "https://wiki.projectgorgon.com/w/api.php";
const WIKI_BASE = "https://wiki.projectgorgon.com/wiki/";

function fetchWikiSearch(query) {
  return new Promise((resolve) => {
    const trimmed = (query || "").trim();
    if (!trimmed) {
      resolve({ results: [], error: null });
      return;
    }
    const params = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: trimmed,
      srlimit: "10",
      format: "json",
      origin: "*"
    });
    const url = `${WIKI_API}?${params.toString()}`;
    const req = https.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) {
        resolve({ results: [], error: "Search failed" });
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try {
          const raw = Buffer.concat(chunks).toString("utf8");
          const data = JSON.parse(raw);
          const list = (data.query && data.query.search) || [];
          const results = list.map((item) => ({
            title: item.title,
            snippet: (item.snippet || "").replace(/<[^>]+>/g, ""),
            url: WIKI_BASE + encodeURIComponent(String(item.title).replace(/ /g, "_"))
          }));
          resolve({ results, error: null });
        } catch (e) {
          resolve({ results: [], error: e.message || "Parse error" });
        }
      });
    });
    req.on("error", (e) => resolve({ results: [], error: e.message || "Network error" }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ results: [], error: "Request timed out" });
    });
  });
}

ipcMain.handle("wiki:search", (event, query) => fetchWikiSearch(query));

function createOrShowWikiWindow(url) {
  if (wikiWindow && !wikiWindow.isDestroyed()) {
    wikiWindow.loadURL(url);
    wikiWindow.show();
    wikiWindow.focus();
    return;
  }
  wikiWindow = new BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 640,
    minHeight: 480,
    title: "Project Gorgon Wiki",
    backgroundColor: "#1a1a1a",
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  wikiWindow.loadURL(url);
  wikiWindow.on("closed", () => {
    wikiWindow = null;
  });
}

ipcMain.on("wiki:open", (event, url) => {
  if (url && typeof url === "string" && url.startsWith(WIKI_BASE)) {
    createOrShowWikiWindow(url);
  }
});
