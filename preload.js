const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  mainMinimize: () => ipcRenderer.send("main:minimize"),
  mainClose: () => ipcRenderer.send("main:close"),

  openMapOverlay: () => ipcRenderer.send("overlay:openMap"),
  openDungeonOverlay: () => ipcRenderer.send("overlay:openDungeon"),
  closeOverlay: () => ipcRenderer.send("overlay:close")
});
