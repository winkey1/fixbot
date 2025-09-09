const path = require('path');
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');

let mainWindow;
let nextServer;

const port = 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);
}

function startNextServer() {
  let serverPath;

  if (app.isPackaged) {
    // 👉 Path saat sudah dibundle ke AppImage/Linux
    serverPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'server.js');
  } else {
    // 👉 Path saat development (jalan langsung di repo)
    serverPath = path.join(__dirname, '../next-app/server.js');
  }

  console.log("Starting server from:", serverPath);

  nextServer = spawn('node', [serverPath], {
    cwd: path.dirname(serverPath),
    shell: true,
    stdio: 'inherit'
  });

  nextServer.on('close', (code) => {
    console.log(`Next.js server exited with code ${code}`);
  });
}

app.on('ready', () => {
  startNextServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
  if (nextServer) nextServer.kill();
});
