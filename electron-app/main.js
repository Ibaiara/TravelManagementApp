// main.js (Electron) - Auto-copia desde red a local + backend con DATA_DIR en red
const { app, BrowserWindow, Menu, Tray, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');

let mainWindow;
let tray;
let serverProcess;

const PORT = 3001;

// ===============================
// 1) CONFIG: rutas RED (ajusta)
// ===============================
// Carpeta "one-dir" en red (la salida de electron-packager copiada a Deploy)
const NETWORK_APP_DIR = 'W:\\comercial\\Gestion de Viajes\\AplicacionViajes\\Deploy\\IngeteamViajes-win32-x64';

// Nombre del exe dentro de esa carpeta
const NETWORK_EXE_NAME = 'IngeteamViajes.exe';
const NETWORK_EXE = path.join(NETWORK_APP_DIR, NETWORK_EXE_NAME);

// Carpeta de datos compartidos en red (JSON)
const NETWORK_DATA_DIR = 'W:\\comercial\\Gestion de Viajes\\AplicacionViajes\\Data';

// ===============================
// 2) CONFIG: rutas LOCAL
// ===============================
const LOCAL_BASE = path.join(os.homedir(), 'AppData', 'Local', 'IngeteamViajes');
const LOCAL_APP_DIR = path.join(LOCAL_BASE, 'app');
const LOCAL_EXE = path.join(LOCAL_APP_DIR, NETWORK_EXE_NAME);

// Chromium cache/userData en local (evita problemas en W:)
app.setPath('userData', path.join(LOCAL_BASE, 'userData'));
app.setPath('cache', path.join(LOCAL_BASE, 'cache'));

// (Opcional) si en algunos PCs sigue fallando GPU, descomenta:
// app.disableHardwareAcceleration();
// app.commandLine.appendSwitch('disable-gpu');
// app.commandLine.appendSwitch('use-angle', 'swiftshader');
// app.commandLine.appendSwitch('disable-gpu-compositing');

function copyDirSync(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

function fileMTime(p) {
  try { return fs.statSync(p).mtimeMs; } catch { return 0; }
}

// Copia si falta o hay versión nueva y relanza desde local
function ensureLocalAppUpToDateAndRelaunch() {
  const runningFromLocal = process.execPath.toLowerCase().startsWith(LOCAL_APP_DIR.toLowerCase());
  if (runningFromLocal) return;

  if (!fs.existsSync(NETWORK_EXE)) {
    // Si no está el exe de red, seguimos sin autocopia (fallback)
    return;
  }

  const needCopy = !fs.existsSync(LOCAL_EXE) || fileMTime(NETWORK_EXE) > fileMTime(LOCAL_EXE);

  try {
    if (needCopy) {
      fs.mkdirSync(LOCAL_APP_DIR, { recursive: true });
      copyDirSync(NETWORK_APP_DIR, LOCAL_APP_DIR);
    }

    // Relanzar desde local
    app.relaunch({ execPath: LOCAL_EXE, args: process.argv.slice(1) });
    app.exit(0);
  } catch (e) {
    // Si falla la copia (permisos/AV), continuamos ejecutando desde donde estemos
    // pero irá más lento
    console.warn('Auto-copia a local falló:', e.message);
  }
}

// Ejecutar auto-copia ANTES de arrancar la app
ensureLocalAppUpToDateAndRelaunch();

// Base dir (dev vs packaged local)
const isDev = !app.isPackaged;
const baseDir = isDev ? path.join(__dirname, '..') : path.dirname(process.execPath);

// Backend siempre junto al exe local (cuando ya se relanzó) o junto al repo (dev)
const serverPath = isDev
  ? path.join(baseDir, 'Backend', 'server.js')
  : path.join(baseDir, 'Backend', 'server.js');

// DATA_DIR en red (compartido)
const dataDir = isDev ? path.join(baseDir, 'Backend', 'datos') : NETWORK_DATA_DIR;

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
}

function waitForServer(timeoutMs = 20000) {
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

    ensureDir(dataDir);

    if (!fs.existsSync(serverPath)) {
      return reject(new Error(`No se encontró server.js en: ${serverPath}`));
    }

    serverProcess = spawn(process.execPath, [serverPath], {
      cwd: path.dirname(serverPath),
      env: {
        ...process.env,
        PORT: String(PORT),
        DATA_DIR: dataDir
      },
      windowsHide: true
    });

    serverProcess.on('error', reject);

    // Esperar a que arranque de verdad
    waitForServer().then(resolve).catch(reject);
  });
}

function createWindow() {
  if (mainWindow) return;

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
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', () => {
    app.isQuitting = true;
    app.quit();
  });

  createMenu();
  createTray();
}

function createMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        { label: 'Actualizar', accelerator: 'F5', click: () => mainWindow?.reload() },
        { type: 'separator' },
        { label: 'Salir', accelerator: 'Alt+F4', click: () => { app.isQuitting = true; app.quit(); } }
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
              message: 'Gestión de Viajes',
              detail: '2026'
            });
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.ico');
  try {
    tray = new Tray(iconPath);
  } catch {
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir Gestión Viajes', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Salir', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.setToolTip('Viajes');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show());
}

// ===============================
// START
// ===============================
app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (error) {
    console.error('❌ Error:', error);
    dialog.showErrorBox('Error', 'No se pudo iniciar el servidor.\n' + (error?.message || ''));
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    try { serverProcess.kill(); } catch {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
  else mainWindow.show();
});