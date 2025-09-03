const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
let log;
try {
  log = require('electron-log');
} catch (e) {
  // Fallback simples caso electron-log não esteja instalado
  log = {
    info: (...args) => console.log('[info]', ...args),
    error: (...args) => console.error('[error]', ...args),
    warn: (...args) => console.warn('[warn]', ...args),
    debug: (...args) => console.debug('[debug]', ...args),
    transports: { file: { level: 'info' } },
    initialize: () => {}
  };
}
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuração do servidor padrão
const DEFAULT_SERVER_CONFIG = {
  host: '192.168.1.54',
  port: 8000,
  protocol: 'http'
};

// Tamanhos predefinidos da janela
const WINDOW_SIZES = {
  small: { width: 900, height: 600, name: 'Pequeno' },
  medium: { width: 1057, height: 600, name: 'Médio' },
  large: { width: 1400, height: 900, name: 'Grande' }
};

// Caminho do arquivo de configuração persistente
const CONFIG_PATH = path.join(os.homedir(), '.id-management-config.json');

// Variáveis globais
let mainWindow = null;
let serverConfig = DEFAULT_SERVER_CONFIG;
let currentWindowSize = 'medium'; // Tamanho padrão

const isDev = process.env.NODE_ENV === 'development';
const UPDATE_CONFIG_PATH = path.join(process.resourcesPath || '', 'app-update.yml');
const hasUpdateConfig = () => {
  try { return fs.existsSync(UPDATE_CONFIG_PATH); } catch { return false; }
};
const canAutoUpdate = () => !isDev && hasUpdateConfig();

// Configurar logger do app e do updater
try {
  log.initialize?.();
  log.transports.file.level = 'info';
  autoUpdater.logger = log;
  log.info('ID Management System iniciado');
} catch (e) {
  console.log('Logger não inicializado', e);
}

// Funções para gerenciar preferências de tamanho
function loadWindowSizePreference() {
  try {
    const fs = require('fs');
    const os = require('os');
    const prefsPath = path.join(os.homedir(), '.id-management-prefs.json');
    if (fs.existsSync(prefsPath)) {
      const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
      return prefs.windowSize || 'medium';
    }
  } catch (error) {
    console.log('Erro ao carregar preferências:', error);
  }
  return 'medium';
}

function saveWindowSizePreference(size) {
  try {
    const fs = require('fs');
    const os = require('os');
    const prefsPath = path.join(os.homedir(), '.id-management-prefs.json');
    let prefs = {};
    if (fs.existsSync(prefsPath)) {
      prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
    }
    prefs.windowSize = size;
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
  } catch (error) {
    console.log('Erro ao salvar preferências:', error);
  }
}

function createWindow() {
  // Carregar preferência salva de tamanho
  const savedSize = loadWindowSizePreference();
  const size = WINDOW_SIZES[savedSize] || WINDOW_SIZES.medium;
  
  // Criar janela principal
  mainWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    minWidth: size.width,
    minHeight: size.height,
    maxWidth: size.width,
    maxHeight: size.height,
    resizable: false, // Não permitir redimensionar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false // Desabilitar para desenvolvimento
    },
    show: false,
    titleBarStyle: 'hidden', // Esconder barra de título padrão
    frame: false, // Remover frame padrão
    backgroundColor: '#1e1b4b' // Cor de fundo para combinar com o tema
  });

  currentWindowSize = savedSize;

  // Configurar menu
  createMenu();

  // Carregar app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading file:', indexPath);
    mainWindow.loadFile(indexPath);
    // DevTools apenas se necessário para debug
    // mainWindow.webContents.openDevTools();
  }

  // Mostrar quando pronto
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (canAutoUpdate()) {
      try {
        autoUpdater.autoDownload = true;
        autoUpdater.checkForUpdates();
      } catch (e) {
        log.error('Erro ao verificar updates', e);
      }
    } else {
      log.warn('Auto-update desabilitado: app-update.yml não encontrado (provável modo portátil).');
    }
  });

  // Fechar app quando janela é fechada
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Abrir links externos no navegador
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createMenu() {
  const template = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Configurar Servidor',
          click: () => showServerConfig()
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Visualizar',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'forceReload', label: 'Forçar Recarga' },
        { role: 'toggleDevTools', label: 'Ferramentas do Desenvolvedor' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom Padrão' },
        { role: 'zoomIn', label: 'Ampliar' },
        { role: 'zoomOut', label: 'Reduzir' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tela Cheia' }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre',
          click: () => showAbout()
        },
        {
          label: 'Verificar Atualizações',
          click: () => {
            if (canAutoUpdate()) {
              autoUpdater.checkForUpdates();
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Atualizações Indisponíveis',
                message: 'Execute o instalador (Setup) para habilitar atualizações automáticas.',
                detail: 'Você está executando a versão portátil. Baixe e instale o arquivo ID-Management-Setup-<versão>.exe do GitHub Releases.'
              });
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function showServerConfig() {
  await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Configuração do Servidor',
    message: 'Configurar conexão com servidor ID Management',
    detail: `Servidor atual: ${serverConfig.protocol}://${serverConfig.host}:${serverConfig.port}\n\nDica: na interface, ajuste via código que usa window.electronAPI.setServerConfig({host, port, protocol}).`,
    buttons: ['OK'],
    defaultId: 0
  });
}

function showAbout() {
  const version = app.getVersion();
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Sobre ID Management System',
    message: `ID Management System v${version}`,
    detail: 'Sistema de gerenciamento de documentos empresariais\n\nDesenvolvido com Electron + React + FastAPI'
  });
}

// Handlers IPC para controles da janela
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-toggle-pin', () => {
  if (mainWindow) {
    const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
    return !isAlwaysOnTop;
  }
  return false;
});

ipcMain.handle('window-resize', (event, sizeKey) => {
  if (mainWindow && WINDOW_SIZES[sizeKey]) {
    const size = WINDOW_SIZES[sizeKey];
    mainWindow.setSize(size.width, size.height);
    mainWindow.setMinimumSize(size.width, size.height);
    mainWindow.setMaximumSize(size.width, size.height);
    
    // Centralizar janela após redimensionar
    mainWindow.center();
    
    // Salvar preferência
    currentWindowSize = sizeKey;
    saveWindowSizePreference(sizeKey);
    
    return { size: sizeKey, dimensions: size };
  }
  return null;
});

ipcMain.handle('window-get-sizes', () => {
  return {
    sizes: WINDOW_SIZES,
    current: currentWindowSize
  };
});

// Utilidades de configuração persistente
function loadServerConfigFromDisk() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      const cfg = JSON.parse(raw);
      if (cfg && cfg.host && cfg.port && cfg.protocol) {
        serverConfig = { ...serverConfig, ...cfg };
      }
    }
  } catch (e) {
    console.log('Erro ao carregar config:', e);
  }
}

function saveServerConfigToDisk() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(serverConfig, null, 2), 'utf8');
  } catch (e) {
    console.log('Erro ao salvar config:', e);
  }
}

// Event handlers
app.whenReady().then(() => {
  // Carrega config do servidor persistente (se existir)
  loadServerConfigFromDisk();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Auto updater events
function sendUpdate(status, payload = {}) {
  try {
    log.info('[updater]', status, payload);
    if (mainWindow) {
      mainWindow.webContents.send('auto-update', { status, ...payload });
    }
  } catch (_) {}
}

autoUpdater.on('checking-for-update', () => {
  sendUpdate('checking');
});

autoUpdater.on('update-available', (info) => {
  sendUpdate('available', { version: info?.version });
});

autoUpdater.on('update-not-available', (info) => {
  sendUpdate('not-available', { version: info?.version });
});

autoUpdater.on('error', (err) => {
  sendUpdate('error', { message: err?.message || String(err) });
});

autoUpdater.on('download-progress', (p) => {
  sendUpdate('progress', { percent: p?.percent || 0, bytesPerSecond: p?.bytesPerSecond, transferred: p?.transferred, total: p?.total });
});

autoUpdater.on('update-downloaded', (info) => {
  sendUpdate('downloaded', { version: info?.version });
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Atualização Pronta',
    message: 'Atualização baixada com sucesso',
    detail: 'A aplicação pode ser reiniciada para aplicar a atualização.',
    buttons: ['Reiniciar Agora', 'Mais Tarde']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

// IPC handlers
ipcMain.handle('get-server-config', () => {
  return serverConfig;
});

// Updater IPC handlers
ipcMain.handle('updater-check', async () => {
  try {
    if (!canAutoUpdate()) {
      sendUpdate('disabled', { message: 'Auto-update indisponível no modo portátil. Instale via Setup.' });
      return { disabled: true };
    }
    const result = await autoUpdater.checkForUpdates();
    return result?.updateInfo || null;
  } catch (e) {
    log.error('Erro no updater-check', e);
    sendUpdate('error', { message: e?.message || String(e) });
    return null;
  }
});

ipcMain.handle('updater-quit-and-install', () => {
  try {
    autoUpdater.quitAndInstall();
  } catch (e) {
    log.error('Erro no quitAndInstall', e);
  }
});

ipcMain.handle('set-server-config', (event, config) => {
  serverConfig = { ...serverConfig, ...config };
  saveServerConfigToDisk();
  return serverConfig;
});
