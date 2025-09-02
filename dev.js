#!/usr/bin/env node
const { spawn } = require('child_process');

console.log('Starting Parco development environment...');

// Start the main server (which serves the frontend via Vite and API routes)
const mainServer = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  shell: true
});

// Start the separate API server on port 4000
const apiServer = spawn('npm', ['--workspace', 'apps/api', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Handle exit
process.on('SIGINT', () => {
  console.log('\nStopping servers...');
  mainServer.kill();
  apiServer.kill();
  process.exit();
});