const next = require('next');
const { createServer } = require('http');

const port = 3000;
const dev = false; // selalu production di Electron
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
