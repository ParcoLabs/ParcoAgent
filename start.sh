#!/bin/bash

# Clear any existing processes
pkill -f "tsx" 2>/dev/null
pkill -f "ts-node-dev" 2>/dev/null

# Wait a moment for processes to clean up
sleep 2

# Start the API server on port 4000
echo "Starting API server on port 4000..."
cd /home/runner/workspace/apps/api
npx tsx src/index.ts &
API_PID=$!

# Start the main server (Vite + frontend) on port 5000
echo "Starting frontend server on port 5000..."
cd /home/runner/workspace
node server-simple.js &
FRONTEND_PID=$!

echo ""
echo "✅ Development environment started!"
echo "   - Frontend: http://localhost:5000 (shows in Replit preview)"
echo "   - Backend API: http://localhost:4000/api"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for both processes
wait $API_PID $FRONTEND_PID