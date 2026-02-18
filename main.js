const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");

let mainWindow = null;
let mapWindow = null;
let dungeonWindow = null;

function createOverlayWindow(file) {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    frame: false,
    backgroundColor: "#111111",
    alwaysOnTop: true,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

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

app.whenReady().then(() => {
  createMainWindow();

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
