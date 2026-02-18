const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");

let mainWindow = null;
let mapWindow = null;
let dungeonWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    backgroundColor: "#0f1115",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile("index.html");

  globalShortcut.register("F7", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    else mainWindow.minimize();
  });
}

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
