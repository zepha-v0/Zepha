const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zephaShell', {
  getState: () => ipcRenderer.invoke('get-state'),
  setState: (state) => ipcRenderer.send('set-state', state),
  close: () => ipcRenderer.send('close-shell'),
  onStateChanged: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('state-changed', listener);
    return () => ipcRenderer.removeListener('state-changed', listener);
  },
});
