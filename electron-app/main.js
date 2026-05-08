const { app, BrowserWindow, Menu, Tray, shell, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');

// 2) userData/cache en local
const localUserData = path.join(os.homedir(), 'AppData', 'Local', 'IngeteamViajes');
app.setPath('userData', localUserData);
app.setPath('cache', path.join(localUserData, 'Cache'));

// 1) desactivar GPU (para red/corporativo)
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('use-angle', 'swiftshader');
app.commandLine.appendSwitch('no-sandbox');

let mainWindow;
let tray;
let serverProcess;
const http = require('http');
const PORT = 3001;

const isDev = !app.isPackaged;

// Dev: raíz del repo (electron-app/..)
// Packaged: carpeta del .exe
const baseDir = isDev ? path.join(__dirname, '..') : path.dirname(process.execPath);

// Backend junto al repo (dev) o junto al exe (pack)
const serverPath = path.join(baseDir, 'Backend', 'server.js');

// Datos en local userData (mejor en red)
const dataDir = 'W:\\comercial\\Gestion de Viajes\\Data';

/**
 * Iniciar servidor Express en el mismo proceso (require)
 */
function waitForServer(timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        if (Date.now() - start > timeoutMs) return reject(new Error('Backend no responde /api/health'));
        setTimeout(tick, 300);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error('Backend no responde (connection refused)'));
        setTimeout(tick, 300);
      });
    };
    tick();
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Iniciando servidor backend...');
    console.log('Servidor:', serverPath);
    console.log('Datos:', dataDir);

    try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}

    serverProcess = spawn(process.execPath, [serverPath], {
      cwd: path.dirname(serverPath),
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        PORT: String(PORT),
        DATA_DIR: dataDir
      },
      windowsHide: true
    });

    serverProcess.on('error', reject);
    // logs del backend (para ver si crashea)
    serverProcess.stdout.on('data', d => console.log('[backend:out]', d.toString()));
    serverProcess.stderr.on('data', d => console.error('[backend:err]', d.toString()));
    serverProcess.on('exit', code => console.error('[backend:exit] code=', code));

    waitForServer().then(resolve).catch(reject);
    
  });
}

/**
 * Crear ventana principal
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Gestión de Viajes',
    backgroundColor: '#f9fafb',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Ventana mostrada');
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', () => {
    if (serverProcess && !serverProcess.killed) {
      try { serverProcess.kill(); } catch {}
    }
    app.isQuitting = true;
    app.quit();
  });

  createMenu();
  createTray();
}

/**
 * Crear menú
 */
function createMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        { label: 'Actualizar', accelerator: 'F5', click: () => mainWindow.reload() },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: 'Alt+F4',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        { label: 'Soporte', click: () => shell.openExternal('mailto:ibai354@gmail.com') },
        {
          label: 'Acerca de',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Viajes',
              message: 'Gestión de Viajes v2.0.0',
              detail: '2026\nSoporte: ibai354@gmail.com'
            });
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/**
 * Crear icono en bandeja
 */
function createTray() {
  const iconPath = path.join(__dirname, 'icon.ico');

  try {
    tray = new Tray(iconPath);
  } catch {
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir Gestión Viajes', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Salir', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.setToolTip('Viajes');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.show());
}

/**
 * Inicializar app
 */
app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (error) {
    console.error('❌ Error:', error);
    dialog.showErrorBox('Error', 'No se pudo iniciar el servidor');
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('🛑 Cerrando aplicación...');
  if (serverProcess && !serverProcess.killed) {
    try { serverProcess.kill(); } catch {}
  }
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
  else mainWindow.show();
});