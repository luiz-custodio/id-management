// Tipos globais para Electron
declare global {
  interface Window {
    electronAPI?: {
      getServerConfig: () => Promise<{
        host: string;
        port: number;
        protocol: string;
      }>;
      setServerConfig: (config: any) => Promise<any>;
      onTestServerConnection: (callback: (url: string) => void) => void;
      
      // Controles da janela
      windowMinimize: () => Promise<void>;
      windowClose: () => Promise<void>;
      windowTogglePin: () => Promise<boolean>;
      windowResize: (sizeKey: string) => Promise<{ size: string; dimensions: { width: number; height: number; name: string } } | null>;
      windowGetSizes: () => Promise<{
        sizes: Record<string, { width: number; height: number; name: string }>;
        current: string;
      }>;

      // Auto-update
      checkForUpdates: () => Promise<any>;
      quitAndInstall: () => Promise<void>;
      onUpdateEvent: (callback: (evt: { status: string; version?: string; percent?: number; message?: string }) => void) => () => void;
      
      platform: string;
      version: string;
      openExternal: (url: string) => Promise<void>;
    }
  }
}

export {};
