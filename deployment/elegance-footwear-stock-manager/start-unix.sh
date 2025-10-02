#!/bin/bash

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
