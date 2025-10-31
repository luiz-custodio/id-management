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

  // Auto update
  checkForUpdates: () => ipcRenderer.invoke('updater-check'),
  quitAndInstall: () => ipcRenderer.invoke('updater-quit-and-install'),
  onUpdateEvent: (callback) => {
    const listener = (_event, data) => callback(data)
    ipcRenderer.on('auto-update', listener)
    return () => ipcRenderer.removeListener('auto-update', listener)
  },
  
  // FS helpers (drag & drop de pastas no Electron)
  expandDroppedPaths: (paths) => ipcRenderer.invoke('fs-expand-dropped', paths),
  // Ler bytes de arquivos por caminho absoluto (usado no processamento em lote via upload)
  readFiles: (paths) => ipcRenderer.invoke('fs-read-files', paths),
  // Abrir diálogo de seleção de arquivos/pastas
  openFileDialog: (options) => ipcRenderer.invoke('dialog-open-files', options),
  
  // Informações do sistema
  platform: process.platform,
  version: process.versions.electron,
});
