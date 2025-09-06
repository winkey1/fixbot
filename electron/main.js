// electron/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Simpan referensi global dari window object, jika tidak, window akan
// ditutup secara otomatis ketika object JavaScript di-garbage collected.
let mainWindow;
let nextServer;

const isDev = process.env.NODE_ENV !== 'production';
const port = 3000; // Port yang sama dengan Next.js

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    // Saat pengembangan, kita load dari server dev Next.js
    mainWindow.loadURL(`http://localhost:${port}`);
    mainWindow.webContents.openDevTools(); // Buka DevTools untuk debug
  } else {
    // Saat produksi, server Next.js berjalan di dalam paket aplikasi
    // Kita load URL dari server yang kita jalankan di bawah
    mainWindow.loadURL(`http://localhost:${port}`);
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', () => {
  // Hanya jalankan server Next.js jika dalam mode produksi
  // Saat dev, kita menjalankannya secara terpisah
  if (!isDev) {
    const userDataPath = app.getPath('userData');
    const options = {
      env: {
        ...process.env, // Warisi semua env yang sudah ada
        DATA_DIR: path.join(userDataPath, 'data'),
        UPLOAD_DIR: path.join(userDataPath, 'uploads')
      }
    };
    const serverPath = path.join(__dirname, '..', 'node_modules', '.bin', 'next');
    
    // Gunakan 'node' untuk menjalankan skrip 'next'
    const command = 'node';
    const args = [serverPath, 'start', '-p', port];
    
    console.log(`Starting Next.js server with command: ${command} ${args.join(' ')}`);

    // Hapus stdio: 'inherit' untuk menangkap output secara manual
  nextServer = spawn(command, args, {
    shell: process.platform === 'win32'
  });

// Tangkap dan cetak output standar dari server
  nextServer.stdout.on('data', (data) => {
   console.log(`LOG DARI NEXT.JS: ${data}`);
  });

// Tangkap dan cetak output error dari server (INI YANG PENTING)
  nextServer.stderr.on('data', (data) => {
    console.error(`ERROR DARI NEXT.JS: ${data}`);
  });

  nextServer.on('close', (code) => {
    console.log(`Server Next.js berhenti dengan kode: ${code}`);
  });

    nextServer.on('error', (err) => {
      console.error('Failed to start Next.js server.', err);
    });
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // Matikan server Next.js saat aplikasi ditutup
  if (nextServer) {
    nextServer.kill();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});