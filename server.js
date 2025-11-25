#!/usr/bin/env node
import { createServer } from 'http';
import { readFileSync, statSync } from 'fs';
import { join, resolve, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0';
const DIST_DIR = resolve(__dirname, 'dist');

// Try to import the SSR handler (only available in production build)
let ssrHandler = null;
try {
  const serverModule = await import('./dist/server.js');
  ssrHandler = serverModule.default;
} catch (error) {
  // SSR handler not available (dev mode or build not complete)
  console.log('SSR handler not available, serving static files only');
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveFile(filePath) {
  try {
    const stats = statSync(filePath);
    if (stats.isFile()) {
      const content = readFileSync(filePath);
      const mimeType = getMimeType(filePath);
      return { content, mimeType, status: 200 };
    }
  } catch (error) {
    // File not found or error reading
  }
  return null;
}

const server = createServer(async (req, res) => {
  // Handle SSR if handler is available
  if (ssrHandler && req.method === 'GET' && !req.url.startsWith('/api/') && !req.url.includes('.')) {
    try {
      // Convert Node.js request to TanStack Start request format
      const url = new URL(req.url, `http://${req.headers.host}`);
      const request = new Request(url.toString(), {
        method: req.method,
        headers: req.headers,
      });
      
      const response = await ssrHandler(request);
      
      // Copy response to Node.js response
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      const body = await response.text();
      res.end(body);
      return;
    } catch (error) {
      console.error('SSR error:', error);
      // Fall through to static file serving
    }
  }
  
  // Serve static files or fallback to index.html for SPA routing
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = filePath.split('?')[0]; // Remove query string
  
  // Security: prevent directory traversal
  if (filePath.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  
  const fullPath = resolve(DIST_DIR, filePath.slice(1));
  
  // Try to serve the file
  const result = serveFile(fullPath);
  
  if (result) {
    res.writeHead(result.status, {
      'Content-Type': result.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.end(result.content);
  } else {
    // For SPA routing, serve index.html for all routes
    const indexPath = resolve(DIST_DIR, 'index.html');
    const indexResult = serveFile(indexPath);
    
    if (indexResult) {
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
      });
      res.end(indexResult.content);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  if (ssrHandler) {
    console.log('SSR enabled');
  }
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});
