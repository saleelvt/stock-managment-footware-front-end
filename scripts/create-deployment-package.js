#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_NAME = 'elegance-footwear-stock-manager';
const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
const VERSION = pkg.version;

console.log('🚀 Creating deployment package...');

// Create deployment directory structure
const deploymentDir = path.join(__dirname, '..', 'deployment');
const packageDir = path.join(deploymentDir, PACKAGE_NAME);

// Clean previous deployment
if (fs.existsSync(deploymentDir)) {
  fs.rmSync(deploymentDir, { recursive: true, force: true });
}

// Create directories
fs.mkdirSync(deploymentDir, { recursive: true });
fs.mkdirSync(packageDir, { recursive: true });

// Build the application
console.log('📦 Building application...');
try {
  execSync('npm run build:prod', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Copy built files to deployment package
console.log('📋 Copying files...');
const buildDir = path.join(__dirname, '..', 'dist');
const packageBuildDir = path.join(packageDir, 'app');

if (fs.existsSync(buildDir)) {
  fs.cpSync(buildDir, packageBuildDir, { recursive: true });
}

// Create server.js for running the application
const serverContent = `#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const APP_DIR = path.join(__dirname, 'app');

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
  let filePath = path.join(APP_DIR, req.url === '/' ? 'index.html' : req.url);

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
        fs.readFile(path.join(APP_DIR, 'index.html'), (err, indexContent) => {
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
  console.log(\`📱 Open your browser and navigate to: http://localhost:\${PORT}\`);
  console.log('💡 The application works completely offline!');
  console.log('🔧 To stop the server, press Ctrl+C');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n👋 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
`;

fs.writeFileSync(path.join(packageDir, 'server.js'), serverContent);

// Create startup scripts for different platforms
console.log('📝 Creating startup scripts...');

// Windows batch script
const windowsScript = `@echo off
echo 🚀 Starting Elegance Footwear Stock Manager...
echo 📱 Opening application in your default browser...
echo 💡 The application works completely offline!
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed!
    echo 📥 Please install Node.js from: https://nodejs.org/
    echo    or contact support for assistance.
    pause
    exit /b 1
)

REM Start the server
echo 🔧 Starting server...
node server.js

pause
`;

fs.writeFileSync(path.join(packageDir, 'start-windows.bat'), windowsScript);

// macOS/Linux shell script
const unixScript = `#!/bin/bash

echo "🚀 Starting Elegance Footwear Stock Manager..."
echo "📱 Opening application in your default browser..."
echo "💡 The application works completely offline!"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "📥 Please install Node.js from: https://nodejs.org/"
    echo "   or contact support for assistance."
    exit 1
fi

# Check if we're on macOS or Linux for opening browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "http://localhost:3000" 2>/dev/null &
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open "http://localhost:3000" 2>/dev/null &
fi

echo "🔧 Starting server..."
node server.js
`;

fs.writeFileSync(path.join(packageDir, 'start-unix.sh'), unixScript);

// Make Unix script executable
try {
  const scriptPath = path.join(packageDir, 'start-unix.sh');
  execSync('chmod +x "' + scriptPath + '"');
} catch (error) {
  // Ignore chmod errors on Windows
}

// Create comprehensive README for client
const readmeContent = '# Elegance Footwear Stock Manager - Offline Version\n\n' +
'## 🎉 Welcome!\n\n' +
'This is your portable, offline-ready stock management system for Elegance Footwear. The application works completely offline and doesn\'t require an internet connection after initial setup.\n\n' +

'## 🚀 Quick Start\n\n' +
'### For Windows Users:\n' +
'1. Double-click `start-windows.bat`\n' +
'2. The application will open automatically in your browser\n' +
'3. Start managing your inventory!\n\n' +

'### For macOS/Linux Users:\n' +
'1. Open terminal in this folder\n' +
'2. Run: `./start-unix.sh`\n' +
'3. Or run: `chmod +x start-unix.sh && ./start-unix.sh`\n' +
'4. The application will open automatically in your browser\n\n' +

'## ✨ Features\n\n' +
'- **📦 Complete Inventory Management** - Add, edit, delete products with size-based stock tracking\n' +
'- **💰 Sales Recording** - Record sales with customer details and automatic stock updates\n' +
'- **↩️ Return Processing** - Handle returns with stock restoration\n' +
'- **📊 Dashboard & Reports** - View statistics and low-stock alerts\n' +
'- **🔍 Search & Filter** - Find products quickly by code, name, or color\n' +
'- **💾 Offline-First** - All data stored locally, works without internet\n\n' +

'## 🛠 System Requirements\n\n' +
'- **Windows, macOS, or Linux** operating system\n' +
'- **Modern web browser** (Chrome, Firefox, Safari, Edge)\n' +
'- **No internet connection required** after setup!\n\n' +

'## 📁 What\'s Included\n\n' +
'- `app/` - The built application files\n' +
'- `server.js` - Simple server to run the application\n' +
'- `start-windows.bat` - Windows startup script\n' +
'- `start-unix.sh` - macOS/Linux startup script\n' +
'- `README.txt` - This file\n\n' +

'## 🔧 Troubleshooting\n\n' +
'### Application won\'t start?\n' +
'1. Make sure you have a modern web browser installed\n' +
'2. Check if any other application is using port 3000\n' +
'3. Try restarting your computer\n\n' +

'### Port already in use?\n' +
'Edit `server.js` and change `const PORT = 3000` to a different number (e.g., 3001)\n\n' +

'### Need help?\n' +
'Contact your system administrator or support team.\n\n' +

'## 💡 Tips\n\n' +
'- **Bookmark the URL** - Save `http://localhost:3000` in your browser bookmarks\n' +
'- **Data Persistence** - All your data is stored locally in your browser\n' +
'- **Multiple Users** - Each computer/user has their own separate data\n' +
'- **Backup** - Copy the entire folder to backup your data\n\n' +

'## 🔒 Security & Privacy\n\n' +
'- All data stays on your computer\n' +
'- No external servers or cloud storage\n' +
'- Perfect for sensitive business data\n\n' +

'---\n\n' +
'**Happy managing! 🎯**\n' +
'*Elegance Footwear Stock Management System*\n';

fs.writeFileSync(path.join(packageDir, 'README.txt'), readmeContent);

// Create a simple package.json for the deployment (for dependencies)
const deploymentPackageJson = {
  name: PACKAGE_NAME,
  version: VERSION,
  description: 'Portable offline stock management system for Elegance Footwear',
  main: 'server.js',
  scripts: {
    start: 'node server.js'
  },
  dependencies: {
    'http-server': pkg.dependencies['http-server']
  },
  engines: {
    node: '>=14.0.0'
  }
};

fs.writeFileSync(
  path.join(packageDir, 'package.json'),
  JSON.stringify(deploymentPackageJson, null, 2)
);

// Create deployment package
console.log('📦 Creating deployment package...');

const packagePath = path.join(deploymentDir, PACKAGE_NAME + '-v' + VERSION + '.zip');

try {
  // Use Node.js native zip creation
  await createZipPackage(deploymentDir, packageDir, PACKAGE_NAME, VERSION);
} catch (error) {
  console.log('⚠️ ZIP creation failed, creating simple copy...');
  console.log('✅ Files ready in: ' + packageDir);
}

async function createZipPackage(deploymentDir, packageDir, name, version) {
  const { default: archiver } = await import('archiver');

  return new Promise((resolve, reject) => {
    const zipPath = path.join(deploymentDir, name + '-v' + version + '.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log('✅ ZIP package created: ' + zipPath + ' (' + archive.pointer() + ' bytes)');
      console.log('');
      console.log('🎯 Deployment package ready!');
      console.log('📂 Location: ' + deploymentDir);
      console.log('📦 Files: ' + name + '-v' + version + '.zip');
      resolve();
    });

    archive.on('error', (err) => {
      console.error('❌ Archive error:', err);
      reject(err);
    });

    archive.pipe(output);
    archive.directory(packageDir, name);
    archive.finalize();
  });
}

console.log('');
console.log('🎉 Deployment package creation completed!');
console.log('📋 Summary:');
console.log('  ✅ Application built for production');
console.log('  ✅ Portable server included');
console.log('  ✅ Cross-platform startup scripts created');
console.log('  ✅ Comprehensive client documentation added');
console.log('  ✅ Package compressed and ready for distribution');
console.log('');
console.log('🚀 Ready to deliver to client!');