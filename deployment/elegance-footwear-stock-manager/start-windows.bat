@echo off
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
