const http = require('http');
const { fetch } = require('wreq-js');
const { Readable } = require('stream');

const TARGET = 'https://openrouter.ai';
const PORT = 8001;

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

const server = http.createServer(async (req, res) => {
  let upstream;

  try {
    const targetUrl = TARGET + req.url;

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        headers[key] = value;
      }
    }

    upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      impersonate: 'chrome',
      signal: AbortSignal.timeout(300000),
    });

    const responseHeaders = {};

    for (const [key, value] of upstream.headers) {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    }

    res.writeHead(upstream.status, responseHeaders);

    if (!upstream.body) {
      res.end();
      return;
    }

    const stream = Readable.fromWeb(upstream.body);

    stream.on('error', (err) => {
      console.error('Upstream stream error:', err.message);

      if (!res.destroyed) {
        res.destroy();
      }
    });

    req.on('close', () => {
      if (!res.writableEnded && !res.destroyed) {
        stream.destroy();
      }
    });

    stream.pipe(res);

  } catch (err) {
    console.error('Proxy error:', err);

    if (!res.headersSent && !res.destroyed) {
      res.writeHead(502, {
        'Content-Type': 'application/json',
      });

      res.end(JSON.stringify({
        error: 'proxy_error',
        message: String(err),
      }));
    } else if (!res.destroyed) {
      res.destroy();
    }
  }
});

server.on('clientError', (err, socket) => {
  console.error('Client error:', err.message);
  socket.destroy();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`OpenRouter TLS-proxy listening on http://127.0.0.1:${PORT}`);
});
