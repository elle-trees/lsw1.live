#!/usr/bin/env node
import { createServer } from 'http';
import { readFileSync, statSync, existsSync } from 'fs';
import { join, resolve, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0';
const DIST_DIR = resolve(__dirname, 'dist');
const SERVER_ENTRY = resolve(DIST_DIR, 'server/server.js');

// Check if SSR is available (server bundle exists)
const SSR_ENABLED = existsSync(SERVER_ENTRY);

// Lazy load SSR render function only if SSR is enabled
let render;
if (SSR_ENABLED) {
  try {
    const serverModule = await import(SERVER_ENTRY);
    render = serverModule.render;
  } catch (error) {
    console.warn('SSR module failed to load, falling back to SPA mode:', error.message);
  }
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
  try {
    const url = req.url || '/';
    const [pathname] = url.split('?');
    
    // Security: prevent directory traversal
    if (pathname.includes('..')) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }
    
    // Check if this is a static asset request
    const ext = extname(pathname).toLowerCase();
    const isStaticAsset = ext && ext !== '.html' && !pathname.startsWith('/api');
    
    if (isStaticAsset) {
      // Serve static assets directly
      const fullPath = resolve(DIST_DIR, pathname.slice(1));
      const result = serveFile(fullPath);
      
      if (result) {
        res.writeHead(result.status, {
          'Content-Type': result.mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        res.end(result.content);
        return;
      }
    }
    
    // For HTML requests, use SSR if available, otherwise fall back to SPA
    if (render && !isStaticAsset) {
      try {
        // Render the app server-side
        const { html, dehydratedState } = await render(url, req, res);
        
        // Read the HTML template
        const indexPath = resolve(DIST_DIR, 'index.html');
        const indexResult = serveFile(indexPath);
        
        if (indexResult) {
          let htmlContent = indexResult.content.toString();
          
          // Inject the rendered HTML into the root div
          htmlContent = htmlContent.replace(
            '<div id="root"></div>',
            `<div id="root">${html}</div>`
          );
          
          // Inject dehydrated state for React Query hydration
          const stateScript = `<script>window.__REACT_QUERY_STATE__ = ${JSON.stringify(dehydratedState)};</script>`;
          htmlContent = htmlContent.replace(
            '</head>',
            `${stateScript}</head>`
          );
          
          res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache',
          });
          res.end(htmlContent);
          return;
        }
      } catch (ssrError) {
        console.error('SSR rendering error:', ssrError);
        // Fall through to SPA fallback
      }
    }
    
    // Fallback to SPA mode: serve index.html
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
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(SSR_ENABLED && render ? 'SSR mode enabled' : 'Serving static files (SPA mode)');
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});
