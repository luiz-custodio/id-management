import { contextBridge, ipcRenderer } from 'electron';

// Exposição segura das APIs do Electron para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuração do servidor
  getServerConfig: () => ipcRenderer.invoke('get-server-config'),
  setServerConfig: (config: any) => ipcRenderer.invoke('set-server-config', config),
  
  // Teste de conexão
  onTestServerConnection: (callback: (url: string) => void) => {
    ipcRenderer.on('test-server-connection', (_event, url) => callback(url));
  },
  
  // Informações do sistema
  platform: process.platform,
  version: process.versions.electron,
  
  // Utilitários
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url)
});

// Tipos para TypeScript
declare global {
  interface Window {
    electronAPI: {
      getServerConfig: () => Promise<{
        host: string;
        port: number;
        protocol: string;
      }>;
      setServerConfig: (config: any) => Promise<any>;
      onTestServerConnection: (callback: (url: string) => void) => void;
      platform: string;
      version: string;
      openExternal: (url: string) => Promise<void>;
    }
  }
}

export {};
