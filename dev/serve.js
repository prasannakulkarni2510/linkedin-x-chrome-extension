// Static server for the mock feed. `npm run serve` -> http://localhost:5173/
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, 'mock-feed');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };

function startServer(port = 5173) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = path.resolve(ROOT, rel);
    // Everything else falls back to the feed page: /x/... to the X mock, the rest to LinkedIn's.
    const fallback = /^\/x(\/|$)/.test(url.pathname) ? path.join(ROOT, 'x', 'index.html') : path.join(ROOT, 'index.html');
    const target = file.startsWith(ROOT) && fs.existsSync(file) && fs.statSync(file).isFile() ? file : fallback;
    res.writeHead(200, { 'content-type': TYPES[path.extname(target)] || 'application/octet-stream' });
    fs.createReadStream(target).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ port: server.address().port, close: () => server.close() }));
  });
}

if (require.main === module) {
  startServer(Number(process.env.PORT) || 5173).then(({ port }) => console.log(`Mock feed: http://localhost:${port}/`));
}

module.exports = { startServer };
