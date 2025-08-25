const { contextBridge, ipcRenderer } = require('electron');

// Exposição segura das APIs do Electron para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuração do servidor
  getServerConfig: () => ipcRenderer.invoke('get-server-config'),
  setServerConfig: (config) => ipcRenderer.invoke('set-server-config', config),
  
  // Informações do sistema
  platform: process.platform,
  version: process.versions.electron,
});
