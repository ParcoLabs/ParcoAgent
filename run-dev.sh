#!/bin/bash

echo "🚀 Starting Parco Development Environment"
echo "==========================================="

# Kill any existing processes
pkill -f "ts-node-dev" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1

# Start API server on port 4000 
echo "📦 Starting Backend API on port 4000..."
cd /home/runner/workspace/apps/api
npm run dev &

# Start Frontend using Vite directly from apps/web
echo "🎨 Starting Frontend UI on port 5000..."
cd /home/runner/workspace/apps/web
npx vite --port 5000 --host 0.0.0.0 &

sleep 3

echo ""
echo "✅ DEVELOPMENT ENVIRONMENT READY!"
echo "================================="
echo "🎨 Frontend UI: http://localhost:5000 (shows in Replit preview)"
echo "📦 Backend API: http://localhost:4000"
echo ""
echo "📁 Project Structure:"
echo "   apps/web/    → Frontend (React + Vite)"
echo "   apps/api/    → Backend (Express + TypeScript)"
echo "   packages/shared/ → Shared types"
echo ""
echo "🔧 Add new backend routes in: apps/api/src/index.ts"
echo "🎨 Frontend pages are in: apps/web/src/pages/"
echo ""
echo "Press Ctrl+C to stop all servers"

# Keep the script running
tail -f /dev/null