const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');
const httpProxy = require('http-proxy');

// Create a proxy to the backend on port 8001
const apiProxy = httpProxy.createProxyServer({
  target: 'http://localhost:8001',
  changeOrigin: true,
});

// Create a proxy to the expo server on port 19006
const expoProxy = httpProxy.createProxyServer({
  target: 'http://localhost:19006',
  ws: true,
  changeOrigin: true,
});

const server = http.createServer((req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  
  if (req.url.startsWith('/api')) {
    // Forward /api/* requests to backend on port 8001
    console.log(`[Proxy] -> Backend: ${req.url}`);
    apiProxy.web(req, res, {}, (err) => {
      console.error('[Proxy] Backend error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend unavailable', detail: err.message }));
    });
  } else {
    // Forward all other requests to expo on port 19006
    expoProxy.web(req, res, {}, (err) => {
      console.error('[Proxy] Expo error:', err.message);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Expo server unavailable');
    });
  }
});

// Handle WebSocket upgrades (for hot reload)
server.on('upgrade', (req, socket, head) => {
  console.log(`[Proxy] WebSocket upgrade: ${req.url}`);
  expoProxy.ws(req, socket, head);
});

// Handle errors
apiProxy.on('error', (err, req, res) => {
  console.error('[API Proxy] Error:', err.message);
});

expoProxy.on('error', (err, req, res) => {
  console.error('[Expo Proxy] Error:', err.message);
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log(`[Proxy] API Proxy Server started on port ${PORT}`);
  console.log(`[Proxy] /api/* -> http://localhost:8001`);
  console.log(`[Proxy] /* -> http://localhost:19006 (expo)`);
  console.log('========================================');
});
