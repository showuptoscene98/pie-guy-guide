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
    const body = firstNewline === -1 ? "" : trimmed.slice(firstNewline + 1).trim();
    const date = dateLine.replace(/\s+/g, " ").trim();
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
  const apply = () => {
    if (win.isDestroyed()) return;
    const game = getGameWindowBounds();
    const [w, h] = win.getSize();
    if (game) {
      const x = Math.round(game.x + game.width - w - ANCHOR_OFFSET_PX);
      const y = Math.round(game.y + ANCHOR_OFFSET_PX);
      win.setPosition(x, y);
    }
  };

  win.once("show", () => {
    apply();
    if (!getGameWindowBounds()) win.center();
    win._anchorInterval = setInterval(apply, ANCHOR_POLL_MS);
  });
  win.on("closed", () => {
    if (win._anchorInterval) clearInterval(win._anchorInterval);
  });
}

function createOverlayWindow(file) {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    frame: false,
    backgroundColor: "#111111",
    alwaysOnTop: true,
    center: !windowManager,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (windowManager) startAnchoredToGame(win);
  win.loadFile(file);
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
ipcMain.on("main:minimize", () => mainWindow?.minimize());
ipcMain.on("main:close", () => mainWindow?.close());

// Map overlay: minimize main until map closes
ipcMain.on("overlay:openMap", () => {
  if (mapWindow) {
    mapWindow.show();
    mapWindow.focus();
    return;
  }

  if (mainWindow && !mainWindow.isMinimized()) mainWindow.minimize();

  mapWindow = createOverlayWindow("map.html");
  mapWindow.on("closed", () => {
    mapWindow = null;
    restoreMainIfMinimized();
  });
});

// Dungeon overlay: same behavior
ipcMain.on("overlay:openDungeon", () => {
  if (dungeonWindow) {
    dungeonWindow.show();
    dungeonWindow.focus();
    return;
  }

  if (mainWindow && !mainWindow.isMinimized()) mainWindow.minimize();

  dungeonWindow = createOverlayWindow("dungeon.html");
  dungeonWindow.on("closed", () => {
    dungeonWindow = null;
    restoreMainIfMinimized();
  });
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
  autoUpdater.quitAndInstall(false, true);
});
ipcMain.handle("updater:getVersion", () => app.getVersion());

// Project Gorgon news (Home screen)
ipcMain.handle("pg-news:fetch", () => fetchProjectGorgonNews());
