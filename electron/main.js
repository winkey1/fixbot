const path = require('path');
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const waitOn = require('wait-on'); // install dulu: npm install wait-on

let mainWindow;
let nextServer;

const port = 3000;
const serverUrl = `http://127.0.0.1:${port}`;

function getServerPath() {
  if (app.isPackaged) {
    // Path di dalam AppImage / build
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'server.js');
  } else {
    // Path saat development
    return path.join(__dirname, '../next-app/server.js');
  }
}

function startNextServer() {
  const serverPath = getServerPath();
  console.log('Starting server from:', serverPath);

  nextServer = spawn(process.execPath, [serverPath], {
    cwd: path.dirname(serverPath),
    shell: false,          // ❌ jangan pakai shell biar aman spasi
    stdio: 'inherit'
  });

  nextServer.on('close', (code) => {
    console.log(`Next.js server exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Tunggu server siap dulu baru load URL
  waitOn({ resources: [serverUrl], timeout: 30000 }, (err) => {
    if (err) {
      console.error('Server not ready:', err);
      return;
    }
    mainWindow.loadURL(serverUrl);
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
