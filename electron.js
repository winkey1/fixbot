const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let server;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL("http://localhost:3000");

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  // jalankan Next.js build hasil produksi
  server = spawn(
    'node',
    ['node_modules/next/dist/bin/next', 'start', '-p', '3000'],
    {
      cwd: path.join(__dirname),
      env: process.env,
      stdio: 'inherit',
    }
  );

  // tunggu server siap baru buka window
  setTimeout(createWindow, 4000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (server) {
    server.kill();
  }
});
