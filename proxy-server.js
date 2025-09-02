#!/usr/bin/env node
const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');

const app = express();

// Proxy API requests to the backend (must come first)
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:4000',
  changeOrigin: true,
  logLevel: 'info'
}));

// Proxy everything else to Vite (must come last)
app.use('/', createProxyMiddleware({
  target: 'http://localhost:5173',
  changeOrigin: true,
  ws: true // Enable WebSocket proxy for HMR
}));

const server = app.listen(5000, '0.0.0.0', () => {
  console.log('Proxy server running on http://localhost:5000');
  console.log('- Frontend (Vite): http://localhost:5173');
  console.log('- API: http://localhost:4000');
});