const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Main window
  mainMinimize: () => ipcRenderer.send("main:minimize"),
  mainClose: () => ipcRenderer.send("main:close"),

  // Overlays
  openMap: () => ipcRenderer.send("overlay:openMap"),
  openDungeon: () => ipcRenderer.send("overlay:openDungeon"),
  closeOverlay: () => ipcRenderer.send("overlay:close")
});
