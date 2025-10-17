const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const BACKEND_PORT = 3000;

// Simple proxy server
const server = http.createServer((req, res) => {
  // Handle API requests - proxy to backend
  if (req.url.startsWith('/api/')) {
    const options = {
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.writeHead(500);
      res.end('Proxy error');
    });

    req.pipe(proxyReq);
    return;
  }

  // Handle static files
  let filePath = path.join(__dirname, 'client/dist', req.url === '/' ? 'index.html' : req.url);
  
  // Handle client-side routing - serve index.html for non-API routes
  if (!req.url.startsWith('/api/') && !req.url.includes('.')) {
    filePath = path.join(__dirname, 'client/dist/index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (req.url.startsWith('/api/')) {
        res.writeHead(404);
        res.end('API endpoint not found');
      } else {
        // For client-side routing, serve index.html
        fs.readFile(path.join(__dirname, 'client/dist/index.html'), (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end('File not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
          }
        });
      }
    } else {
      const ext = path.extname(filePath);
      const contentType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json'
      }[ext] || 'text/plain';
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from client/dist`);
  console.log(`🔄 Proxying API calls to http://localhost:${BACKEND_PORT}`);
});
