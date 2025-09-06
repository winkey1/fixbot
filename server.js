// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

// Set environment untuk produksi
process.env.NODE_ENV = 'production';

// Tentukan path ke folder build Next.js di dalam paket aplikasi
const dir = path.join(__dirname, '.next');
const app = next({ dir });
const handle = app.getRequestHandler();

const port = 3000;

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Next.js server ready on http://localhost:${port}`);
  });
});