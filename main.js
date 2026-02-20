const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");
const https = require("https");
const { autoUpdater } = require("electron-updater");

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
let mapWindow = null;
let dungeonWindow = null;
let wikiWindow = null;

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
        }
      } catch (_) {}
    };

    win.once("show", () => {
      try {
        apply();
        if (!getGameWindowBounds()) win.center();
        win._anchorInterval = setInterval(apply, ANCHOR_POLL_MS);
      } catch (_) {
        win.center();
      }
    });
    win.on("closed", () => {
      if (win._anchorInterval) clearInterval(win._anchorInterval);
    });
  } catch (_) {}
}

function createOverlayWindow(file) {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    frame: false,
    show: true,
    backgroundColor: "#111111",
    alwaysOnTop: true,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (windowManager) startAnchoredToGame(win);
  const filePath = path.isAbsolute(file) ? file : path.join(__dirname, file);
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
    backgroundColor: "#1a1a1a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile("index.html");
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function restoreMainIfMinimized() {
  if (mainWindow && mainWindow.isMinimized()) {
    mainWindow.restore();
    mainWindow.focus();
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

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
  autoUpdater.on("error", (err) => sendStatus("updater:error", err.message || String(err)));

  // Auto-check shortly after app ready
  setTimeout(() => autoUpdater.checkForUpdates(), 3000);
}

app.whenReady().then(() => {
  createMainWindow();
  setupAutoUpdater();

  // Hotkey: F7 minimize/restore
  globalShortcut.register("F7", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    else mainWindow.minimize();
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
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
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

    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMinimized()) mainWindow.minimize();

    mapWindow = createOverlayWindow("map.html");
    mapWindow.on("closed", () => {
      mapWindow = null;
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

    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMinimized()) mainWindow.minimize();

    dungeonWindow = createOverlayWindow("dungeon.html");
    dungeonWindow.on("closed", () => {
      dungeonWindow = null;
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
