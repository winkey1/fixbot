// server.js
const next = require('next');
const http = require('http');
const { parse } = require('url');

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

console.log(`[server.js] Starting Next.js server on port ${port}, dev=${dev}`);

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      console.log(`[server.js] Incoming request: ${req.method} ${req.url}`);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('[server.js] Request handler error:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`[server.js] Listening on http://127.0.0.1:${port}`);
  });
}).catch((err) => {
  console.error('[server.js] Error preparing Next:', err);
  process.exit(1);
});
