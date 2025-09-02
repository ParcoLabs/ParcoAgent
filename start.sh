#!/bin/bash

# Clear any existing processes
pkill -f "node" 2>/dev/null
pkill -f "tsx" 2>/dev/null
pkill -f "vite" 2>/dev/null

# Wait a moment for processes to clean up
sleep 2

# Use the specific npm path to avoid Nix conflicts
echo "Starting development servers..."
/nix/store/8y4ls7z2sfxbq6ch3yp45l28p29qswvx-nodejs-20.19.3-wrapped/bin/npm run dev