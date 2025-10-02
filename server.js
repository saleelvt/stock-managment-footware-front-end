#!/usr/bin/env node

/**
 * Simple HTTP Server for Elegance Footwear Stock Manager
 * Serves the built application on port 3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
  let filePath;

  // Serve from root if it exists (for development)
  if (fs.existsSync(path.join(__dirname, 'dist'))) {
    filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url);
  } else {
    // Fallback for direct serving
    filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  }

  // Add .html extension for routes (SPA support)
  if (!path.extname(filePath)) {
    filePath += '.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // File not found, serve index.html for SPA routing
        const indexPath = path.join(__dirname, 'dist', 'index.html');
        fs.readFile(indexPath, (err, indexContent) => {
          if (err) {
            res.writeHead(500);
            res.end('Error loading application');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\\n');
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('🚀 Elegance Footwear Stock Manager is running!');
  console.log(`📱 Open your browser and navigate to: http://localhost:${PORT}`);
  console.log('💡 The application works completely offline!');
  console.log('🔧 To stop the server, press Ctrl+C');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});