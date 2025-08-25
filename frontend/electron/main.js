const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Configuração do servidor padrão
const DEFAULT_SERVER_CONFIG = {
  host: '192.168.1.52',
  port: 8000,
  protocol: 'http'
};

// Variáveis globais
let mainWindow = null;
let serverConfig = DEFAULT_SERVER_CONFIG;

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  // Criar janela principal
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev
    },
    show: false,
    titleBarStyle: 'default'
  });

  // Configurar menu
  createMenu();

  // Carregar app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
