const { autoUpdater } = require("electron-updater");
const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");

let mainWindow = null;
let mapWindow = null;
let dungeonWindow = null;

function createMainWindow() {
  const splash = new BrowserWindow({
    width: 420,
    height: 160,
    frame: false,
    transparent: false,
    backgroundColor: "#0a0a0a",
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  splash.loadFile("splash.html");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    show: false, // IMPORTANT: wait until ready
    backgroundColor: "#0f1115",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile("index.html");

  mainWindow.once("ready-to-show", () => {
    splash.close();
    mainWindow.show();
    mainWindow.focus();
  });

  globalShortcut.register("F7", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    else mainWindow.minimize();
  });
}

  globalShortcut.register("F7", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    else mainWindow.minimize();
  });

function createOverlayWindow(file) {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    frame: false,
    backgroundColor: "#0f1115",
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(file);
  return win;
}

app.whenReady().then(createMainWindow);
autoUpdater.checkForUpdatesAndNotify();
autoUpdater.on("update-available", () => console.log("Update available"));
autoUpdater.on("update-downloaded", () => console.log("Update downloaded"));
autoUpdater.on("error", (e) => console.log("Updater error:", e));

ipcMain.on("main:minimize", () => mainWindow?.minimize());
ipcMain.on("main:close", () => mainWindow?.close());

ipcMain.on("overlay:openMap", () => {
  if (mapWindow) return mapWindow.show(), mapWindow.focus();
  mapWindow = createOverlayWindow("map.html");
  mapWindow.on("closed", () => (mapWindow = null));
});

ipcMain.on("overlay:openDungeon", () => {
  if (dungeonWindow) return dungeonWindow.show(), dungeonWindow.focus();
  dungeonWindow = createOverlayWindow("dungeon.html");
  dungeonWindow.on("closed", () => (dungeonWindow = null));
});

ipcMain.on("overlay:close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.close();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
