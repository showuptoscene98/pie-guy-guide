const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Main window
  mainMinimize: () => ipcRenderer.send("main:minimize"),
  mainClose: () => ipcRenderer.send("main:close"),

  // Overlays
  openMap: () => ipcRenderer.send("overlay:openMap"),
  openDungeon: () => ipcRenderer.send("overlay:openDungeon"),
  closeOverlay: () => ipcRenderer.send("overlay:close"),

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
