const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Main window
  mainMinimize: () => ipcRenderer.send("main:minimize"),
  mainClose: () => ipcRenderer.send("main:close"),
  setWindowOpacity: (value) => ipcRenderer.send("main:setOpacity", value),

  // Overlays
  openMap: () => ipcRenderer.send("overlay:openMap"),
  openDungeon: () => ipcRenderer.send("overlay:openDungeon"),
  closeOverlay: () => ipcRenderer.send("overlay:close"),
  setOverlaySize: (width, height) => ipcRenderer.send("overlay:setSize", width, height),
  setOverlayOpacity: (value) => ipcRenderer.send("overlay:setOpacity", value),
  setOverlayClickthrough: (enabled) => ipcRenderer.send("overlay:setClickthrough", enabled),
  onOverlayClickthroughState: (cb) => ipcRenderer.on("overlay:clickthroughState", (e, value) => cb(value)),
  getOverlayAnchorPreference: () => ipcRenderer.invoke("overlay:getAnchorPreference"),
  setOverlayAnchorPreference: (value) => ipcRenderer.send("overlay:setAnchorPreference", value),
  getOverlayTitleBarVisible: () => ipcRenderer.invoke("overlay:getTitleBarVisible"),
  onOverlayTitleBarVisible: (cb) => ipcRenderer.on("overlay:titleBarVisible", (e, value) => cb(value)),
  getCurrentMapZone: () => ipcRenderer.invoke("overlay:getCurrentMapZone"),
  setCurrentMapZone: (value) => ipcRenderer.send("overlay:setCurrentMapZone", value),
  onCurrentMapZone: (cb) => ipcRenderer.on("overlay:currentMapZone", (e, value) => cb(value)),
  getCurrentDungeonZone: () => ipcRenderer.invoke("overlay:getCurrentDungeonZone"),
  setCurrentDungeonZone: (value) => ipcRenderer.send("overlay:setCurrentDungeonZone", value),
  onCurrentDungeonZone: (cb) => ipcRenderer.on("overlay:currentDungeonZone", (e, value) => cb(value)),
  getPlayerIconPosition: (overlayType, zone) => ipcRenderer.invoke("overlay:getPlayerIconPosition", overlayType, zone),
  setPlayerIconPosition: (overlayType, zone, x, y) => ipcRenderer.send("overlay:setPlayerIconPosition", overlayType, zone, x, y),
  onOverlaySwitchToMap: (cb) => ipcRenderer.on("overlay:switchToMap", (e, zone) => cb(zone)),
  onOverlaySwitchToDungeon: (cb) => ipcRenderer.on("overlay:switchToDungeon", (e, zone) => cb(zone)),
  getGameWindowSourceId: () => ipcRenderer.invoke("overlay:getGameWindowSourceId"),
  getTheme: () => ipcRenderer.invoke("preferences:getTheme"),
  setTheme: (value) => ipcRenderer.send("preferences:setTheme", value),

  // Updater
  checkForUpdates: () => ipcRenderer.send("updater:check"),
  quitAndInstall: () => ipcRenderer.send("updater:quitAndInstall"),
  getAppVersion: () => ipcRenderer.invoke("updater:getVersion"),
  onUpdaterChecking: (cb) => { ipcRenderer.on("updater:checking", () => cb()); },
  onUpdaterUpdateAvailable: (cb) => { ipcRenderer.on("updater:update-available", (e, info) => cb(info)); },
  onUpdaterUpdateNotAvailable: (cb) => { ipcRenderer.on("updater:update-not-available", (e, info) => cb(info)); },
  onUpdaterDownloadProgress: (cb) => { ipcRenderer.on("updater:download-progress", (e, progress) => cb(progress)); },
  onUpdaterUpdateDownloaded: (cb) => { ipcRenderer.on("updater:update-downloaded", (e, info) => cb(info)); },
  onUpdaterError: (cb) => { ipcRenderer.on("updater:error", (e, err) => cb(err)); },

  // Project Gorgon news
  fetchProjectGorgonNews: () => ipcRenderer.invoke("pg-news:fetch"),

  // Project Gorgon Wiki search
  searchWiki: (query) => ipcRenderer.invoke("wiki:search", query),
  openWikiPage: (url) => ipcRenderer.send("wiki:open", url)
});
