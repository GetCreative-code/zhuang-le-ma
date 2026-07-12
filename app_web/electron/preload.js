const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  executeScript: (data) => ipcRenderer.invoke('execute-script', data),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  onScriptOutput: (callback) => { ipcRenderer.on('script-output', (event, data) => callback(data)); },
  removeScriptOutputListener: () => { ipcRenderer.removeAllListeners('script-output'); },
});
