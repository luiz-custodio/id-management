import { app, BrowserWindow, Menu, dialog, shell, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { autoUpdater } from 'electron-updater';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuração do servidor padrão
const DEFAULT_SERVER_CONFIG = {
  host: '192.168.1.52',
  port: 8000,
  protocol: 'http'
};

// Variáveis globais
let mainWindow: BrowserWindow | null = null;
let serverConfig = DEFAULT_SERVER_CONFIG;

const isDev = process.env.NODE_ENV === 'development';
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

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
    icon: path.join(__dirname, '../build/icon.png'),
    show: false,
    titleBarStyle: 'default'
  });

  // Configurar menu
  createMenu();

  // Carregar app
  if (isDev && VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Mostrar quando pronto
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
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
  const template: Electron.MenuItemConstructorOptions[] = [
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
  const result = await dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'Configuração do Servidor',
    message: 'Configurar conexão com servidor ID Management',
    detail: `Servidor atual: ${serverConfig.protocol}://${serverConfig.host}:${serverConfig.port}`,
    buttons: ['Alterar', 'Testar Conexão', 'Cancelar'],
    defaultId: 0
  });

  if (result.response === 0) {
    // Alterar configuração
    // Aqui você pode implementar um dialog customizado
    // Por simplicidade, usando prompt do sistema
    console.log('Implementar dialog de configuração personalizado');
  } else if (result.response === 1) {
    // Testar conexão
    testServerConnection();
  }
}

async function testServerConnection() {
  try {
    const serverUrl = `${serverConfig.protocol}://${serverConfig.host}:${serverConfig.port}`;
    
    // Enviar teste para o renderer process
    mainWindow?.webContents.send('test-server-connection', serverUrl);
    
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Teste de Conexão',
      message: 'Testando conexão com o servidor...',
      detail: `URL: ${serverUrl}`,
      buttons: ['OK']
    });
  } catch (error) {
    dialog.showErrorBox('Erro de Conexão', `Não foi possível conectar ao servidor: ${error}`);
  }
}

function showAbout() {
  dialog.showMessageBox(mainWindow!, {
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
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'Atualização Disponível',
    message: `Nova versão ${info.version} disponível`,
    detail: 'A atualização será baixada automaticamente.',
    buttons: ['OK']
  });
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Nenhuma atualização disponível:', info);
});

autoUpdater.on('error', (err) => {
  console.error('Erro no auto-updater:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let logMessage = `Velocidade: ${progressObj.bytesPerSecond}`;
  logMessage = logMessage + ` - Baixado ${progressObj.percent}%`;
  logMessage = logMessage + ` (${progressObj.transferred}/${progressObj.total})`;
  console.log(logMessage);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Atualização baixada:', info);
  dialog.showMessageBox(mainWindow!, {
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

// Configuração de produção vs desenvolvimento
if (!isDev) {
  // Configurações específicas de produção
  app.setAsDefaultProtocolClient('id-management');
}

export { };
