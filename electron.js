const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let server;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: { nodeIntegration: false }
  });

  // Arahkan ke Next.js server
  mainWindow.loadURL("http://localhost:3000");

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('ready', () => {
  // Jalankan server.js hasil build Next.js
  server = spawn('node', ['server.js'], {
    cwd: path.join(__dirname),
    env: process.env,
    stdio: 'inherit'
  });

  setTimeout(createWindow, 4000); // tunggu server siap
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  if (server) server.kill();
});
