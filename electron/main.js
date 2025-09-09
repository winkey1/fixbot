// electron-main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const waitOn = require('wait-on');

let mainWindow;
let nextProcess = null;
const port = process.env.PORT || 3000;
const serverUrl = `http://127.0.0.1:${port}`;

function createWindow() {
  console.log('[electron-main] Creating BrowserWindow...');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  console.log(`[electron-main] Loading URL: ${serverUrl}`);
  mainWindow.loadURL(serverUrl);

  mainWindow.on('closed', () => {
    console.log('[electron-main] Main window closed');
    mainWindow = null;
  });
}

function startNextDev() {
  console.log('[electron-main] Spawning Next.js dev server...');
  nextProcess = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'dev', '-p', String(port)], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: Object.assign({}, process.env)
  });
}

function startNextProd() {
  console.log('[electron-main] Spawning Next.js production server...');
  const serverPath = path.join(process.resourcesPath || process.cwd(), 'server.js');
  console.log(`[electron-main] Server path: ${serverPath}`);
  nextProcess = spawn(process.execPath, [serverPath], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NODE_ENV: 'production' })
  });
}

app.on('ready', async () => {
  console.log('[electron-main] App ready, isPackaged=', app.isPackaged);

  if (!app.isPackaged) {
    startNextDev();
  } else {
    startNextProd();
  }

  try {
    console.log(`[electron-main] Waiting for ${serverUrl}...`);
    await waitOn({ resources: [serverUrl], timeout: 30000 });
    console.log('[electron-main] Next.js server is ready');
  } catch (err) {
    console.error('[electron-main] Timed out waiting for Next.js server:', err);
  }

  createWindow();
});

app.on('window-all-closed', () => {
  console.log('[electron-main] All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('[electron-main] App quitting, killing Next.js process');
  if (nextProcess) {
    try { nextProcess.kill(); } catch (e) { console.error('[electron-main] Error killing process:', e); }
  }
});

app.on('activate', () => {
  console.log('[electron-main] App activated');
  if (mainWindow === null) createWindow();
});
