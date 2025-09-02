#!/bin/bash
# Kill any existing processes
pkill -f vite 2>/dev/null
pkill -f tsx 2>/dev/null
pkill -f "node.*proxy" 2>/dev/null

echo "Starting development servers..."

# Start API server
cd /home/runner/workspace/apps/api
npx tsx src/index.ts &
API_PID=$!
echo "API server starting on port 4000 (PID: $API_PID)"

# Wait for API to start
sleep 2

# Start Vite frontend
cd /home/runner/workspace/apps/web  
npx vite --port 5173 --host 0.0.0.0 &
VITE_PID=$!
echo "Vite server starting on port 5173 (PID: $VITE_PID)"

# Wait for Vite to start
sleep 3

# Start proxy server on port 5000
cd /home/runner/workspace
node proxy-server.js &
PROXY_PID=$!
echo "Proxy server starting on port 5000 (PID: $PROXY_PID)"

echo "All servers started!"
echo "Access your app at http://localhost:5000"

# Keep script running
wait