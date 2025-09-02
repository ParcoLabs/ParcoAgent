#!/usr/bin/env node
// Simple dev server startup script
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting development servers...');

// Start the API server
const apiProcess = spawn('npx', ['tsx', 'apps/api/src/index.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '4000' }
});

// Give API a moment to start, then start Vite
setTimeout(() => {
  const viteProcess = spawn('npx', ['vite', '--port', '5000', '--host', '0.0.0.0'], {
    cwd: path.join(__dirname, 'apps/web'),
    stdio: 'inherit',
    shell: true
  });
  
  viteProcess.on('error', (err) => {
    console.error('Vite failed to start:', err);
  });
}, 2000);

apiProcess.on('error', (err) => {
  console.error('API server failed to start:', err);
});

// Handle cleanup
process.on('SIGINT', () => {
  apiProcess.kill();
  process.exit();
});