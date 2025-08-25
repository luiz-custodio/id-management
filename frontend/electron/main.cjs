const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Configuração do servidor padrão
const DEFAULT_SERVER_CONFIG = {
  host: '192.168.1.52',
  port: 8000,
  protocol: 'http'
};

// Tamanhos predefinidos da janela
const WINDOW_SIZES = {
  small: { width: 900, height: 600, name: 'Pequeno' },
  medium: { width: 1057, height: 593, name: 'Médio' },
  large: { width: 1400, height: 900, name: 'Grande' }
};

// Variáveis globais
let mainWindow = null;
let serverConfig = DEFAULT_SERVER_CONFIG;
let currentWindowSize = 'medium'; // Tamanho padrão

const isDev = process.env.NODE_ENV === 'development';

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
    
    if (!isDev) {
      // Verificar updates apenas em produção
      autoUpdater.checkForUpdatesAndNotify();
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
          click: () => autoUpdater.checkForUpdatesAndNotify()
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function showServerConfig() {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Configuração do Servidor',
    message: 'Configurar conexão com servidor ID Management',
    detail: `Servidor atual: ${serverConfig.protocol}://${serverConfig.host}:${serverConfig.port}`,
    buttons: ['OK'],
    defaultId: 0
  });
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Sobre ID Management System',
    message: 'ID Management System v0.1.0',
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

// Event handlers
app.whenReady().then(() => {
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
autoUpdater.on('checking-for-update', () => {
  console.log('Verificando atualizações...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Atualização disponível:', info);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Nenhuma atualização disponível:', info);
});

autoUpdater.on('error', (err) => {
  console.error('Erro no auto-updater:', err);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Atualização baixada:', info);
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Atualização Pronta',
    message: 'Atualização baixada com sucesso',
    detail: 'A aplicação será reiniciada para aplicar a atualização.',
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

ipcMain.handle('set-server-config', (event, config) => {
  serverConfig = { ...serverConfig, ...config };
  return serverConfig;
});
