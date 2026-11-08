/**
 * A pretend Web Push service for the tests. Test devices are saved with an
 * endpoint here, so the site's real web-push sends land on this server.
 *
 *   POST /push/:id    a push; answers 201, or 410 (device gone) for ids
 *                     starting "gone-", or waits 10 s for ids starting "slow-"
 *   GET  /__requests  every push received, for tests to inspect
 */
import http from 'node:http';

const PORT = Number(process.env.PUSH_MOCK_PORT || 4012);
const requests = [];

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    req.on('data', () => undefined);
    req.on('end', () => {
      if (url.pathname === '/__health' || url.pathname === '/__requests') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(url.pathname === '/__health' ? { ok: true } : requests));
      }
      const match = req.method === 'POST' && url.pathname.match(/^\/push\/([\w-]+)$/);
      if (!match) {
        res.writeHead(404);
        return res.end();
      }
      const id = match[1];
      requests.push({ id, authorization: Boolean(req.headers.authorization), at: Date.now() });
      if (id.startsWith('slow-')) return setTimeout(() => (res.writeHead(201), res.end()), 10_000);
      res.writeHead(id.startsWith('gone-') ? 410 : 201);
      res.end();
    });
  })
  .listen(PORT, '127.0.0.1');
