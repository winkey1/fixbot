// electron/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let nextServer;

const isDev = process.env.NODE_ENV !== 'production';
const port = 3000; // Port Next.js

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${port}`);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}
function getServerPath() {
  if (app.isPackaged) {
    // Path hasil build (AppImage / exe)
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'server.js');
  } else {
    // Path saat development
    return path.join(__dirname, '../next-app/server.js');
  }
}
// Fungsi polling untuk menunggu server siap
function waitForServer(port, callback) {
  const interval = setInterval(() => {
    http.get(`http://localhost:${port}`, () => {
      clearInterval(interval);
      callback();
    }).on('error', () => {
       console.log('eror disini');
    });
  }, 300);
}

app.on('ready', () => {
  if (!isDev) {
    const userDataPath = app.getPath('userData');
    const envOptions = {
      ...process.env,
      DATA_DIR: path.join(userDataPath, 'data'),
      UPLOAD_DIR: path.join(userDataPath, 'uploads'),
    };

    const serverPath = getServerPath(); console.log('Starting server from:', serverPath);

    console.log(`Starting Next.js server: node ${serverPath}`);

    nextServer = spawn('node', [serverPath], {
      shell: process.platform === 'win32',
      env: envOptions,
    });

    nextServer.stdout.on('data', (data) => {
      console.log(`NEXT.JS LOG: ${data}`);
    });

    nextServer.stderr.on('data', (data) => {
      console.error(`NEXT.JS ERROR: ${data}`);
    });

    nextServer.on('close', (code) => {
      console.log(`Next.js server stopped with code ${code}`);
    });

    nextServer.on('error', (err) => {
      console.error('Failed to start Next.js server', err);
    });

    // Tunggu server siap baru buka BrowserWindow
    waitForServer(port, () => {
      createWindow();
    });

  } else {
    // Dev mode
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (nextServer) nextServer.kill();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
