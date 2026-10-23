const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tracker', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  send: (data) => ipcRenderer.invoke('transaction:send', data),
});
