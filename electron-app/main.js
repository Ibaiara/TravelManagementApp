const { app, BrowserWindow, Menu, Tray, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let tray;
let serverProcess;
const PORT = 3001;

// Ruta al servidor backend
// Detectar si está empaquetado o en desarrollo
const isDev = !app.isPackaged;
const appPath = isDev ? __dirname : path.dirname(app.getPath('exe'));

const serverPath = isDev 
  ? path.join(__dirname, '..', 'Backend', 'server.js')
  : path.join(process.resourcesPath, 'app', 'Backend', 'server.js');

const dataDir = isDev
  ? path.join(__dirname, '..', 'Backend', 'datos')
  : path.join(appPath, 'datos');

/**
 * Iniciar servidor Express
 */
function startServer() {
    return new Promise((resolve, reject) => {
      console.log('🚀 Iniciando servidor backend...');
      console.log('Servidor:', serverPath);
      console.log('Datos:', dataDir);
      
      try {
        // Configurar variables de entorno ANTES de requerir el servidor
        process.env.PORT = PORT;
        process.env.DATA_DIR = dataDir;
        
        // Cargar el servidor Express directamente en este proceso
        // (NO como proceso hijo)
        require(serverPath);
        
        // Esperar 2 segundos para que Express arranque
        setTimeout(() => {
          console.log('✅ Servidor iniciado en el mismo proceso');
          resolve();
        }, 2000);
        
      } catch (error) {
        console.error('❌ Error al cargar servidor:', error);
        reject(error);
      }
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

  // Cargar la app
  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Mostrar cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Ventana mostrada');
  });

  // Links externos en navegador
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

 // Cerrar completamente al dar X
  mainWindow.on('close', (event) => {
  app.isQuitting = true;
  app.quit();
});

  createMenu();
}

/**
 * Crear menú
 */
function createMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Actualizar',
          accelerator: 'F5',
          click: () => mainWindow.reload()
        },
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
        {
          label: 'Soporte',
          click: () => shell.openExternal('mailto:ibai354@gmail.com')
        },
        {
          label: 'Acerca de',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Viajes',
              message: 'Gestión de Viajes v2.0.0',
              detail: '2026 \nSoporte: ibai354@gmail.com'
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
  // Usar icono temporal si no existe icon.ico
  const iconPath = path.join(__dirname, 'icon.ico');
  
  try {
    tray = new Tray(iconPath);
  } catch {
    // Si no hay icono, usar uno por defecto
    return;
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir Gestion Viajes',
      click: () => mainWindow.show()
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
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

// El servidor se cierra automáticamente al cerrar Electron
app.on('before-quit', () => {
    console.log('🛑 Cerrando aplicación...');
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});
