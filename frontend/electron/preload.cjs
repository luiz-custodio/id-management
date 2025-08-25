const { contextBridge, ipcRenderer } = require('electron');

// Exposição segura das APIs do Electron para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuração do servidor
  getServerConfig: () => ipcRenderer.invoke('get-server-config'),
  setServerConfig: (config) => ipcRenderer.invoke('set-server-config', config),
  
  // Controles da janela
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowTogglePin: () => ipcRenderer.invoke('window-toggle-pin'),
  windowResize: (sizeKey) => ipcRenderer.invoke('window-resize', sizeKey),
  windowGetSizes: () => ipcRenderer.invoke('window-get-sizes'),
  
  // Informações do sistema
  platform: process.platform,
  version: process.versions.electron,
});
