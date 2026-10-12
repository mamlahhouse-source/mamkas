const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  scanBluetooth: () => ipcRenderer.invoke("scan-bluetooth"),
  getSerialPorts: () => ipcRenderer.invoke("get-serial-ports"),
  openBluetoothSettings: () => ipcRenderer.invoke("open-bluetooth-settings"),
  printHtml: (payload) => ipcRenderer.invoke("print-html", payload),
  printRaw: (payload) => ipcRenderer.invoke("print-raw", payload),
});
