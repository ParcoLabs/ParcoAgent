#!/bin/bash

# Function to cleanup on exit
cleanup() {
    echo "Stopping all services..."
    pkill -f vite 2>/dev/null
    pkill -f tsx 2>/dev/null
    pkill -f "proxy-server" 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

echo "Starting Parco development environment..."

# Start API server
echo "Starting API server on port 4000..."
cd /home/runner/workspace/apps/api
npx tsx src/index.ts &
API_PID=$!

# Start Vite frontend
echo "Starting Vite frontend on port 5173..."
cd /home/runner/workspace/apps/web
npx vite --host 0.0.0.0 &
VITE_PID=$!

# Start proxy server
echo "Starting proxy server on port 5000..."
cd /home/runner/workspace
node proxy-server.js &
PROXY_PID=$!

echo "All services started!"
echo "- API: http://localhost:4000"
echo "- Frontend: http://localhost:5173"
echo "- Main App (proxy): http://localhost:5000"

# Keep script running
wait