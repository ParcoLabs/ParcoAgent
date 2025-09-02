// Simple server to run Vite in dev mode
const express = require('express');
const { createServer: createViteServer } = require('vite');
const path = require('path');

async function startServer() {
  const app = express();
  
  // Create Vite server in middleware mode
  const vite = await createViteServer({
    root: path.resolve(__dirname, 'apps/web'),
    server: { 
      middlewareMode: true,
      hmr: { port: 5001 }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'apps/web/src'),
        '@shared': path.resolve(__dirname, 'packages/shared/src'),
        '@assets': path.resolve(__dirname, 'attached_assets')
      }
    },
    configFile: false,
    plugins: [],
  });

  // Use vite's middleware
  app.use(vite.middlewares);

  const PORT = 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Frontend server running at http://localhost:${PORT}`);
    console.log(`✅ UI should now appear in Replit preview panel`);
  });
}

startServer().catch(console.error);