// server/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import routes from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// CORS during dev
app.use(
  cors({
    origin: true,
    credentials: false,
  })
);

app.use(express.json({ limit: "5mb" }));

// API
app.use("/api", routes);

// Replit provides PORT (usually 3000). We must use it.
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const server = createServer(app);

// Check if we're in production mode
const isProd = process.env.NODE_ENV === "production";

async function startServer() {
  if (isProd) {
    // Production: serve static files
    const distPath = path.resolve(__dirname, "..", "dist", "public");
    if (fs.existsSync(distPath)) {
      serveStatic(app);
      console.log("[express] serving static files from dist/public");
    } else {
      console.error("[express] Production build not found. Run 'npm run build' first.");
      process.exit(1);
    }
  } else {
    // Development: use Vite middleware
    await setupVite(app, server);
    console.log("[express] Vite development server attached");
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[express] serving on port ${PORT}`);
  });
}

// Start the server
startServer().catch((err) => {
  console.error("[express] Failed to start server:", err);
  process.exit(1);
});

// Helpful logging if the port is busy
server.on("error", (err: any) => {
  if (err?.code === "EADDRINUSE") {
    console.error(`[express] Port ${PORT} is already in use. Stop other runs, then try again.`);
  } else {
    console.error(err);
  }
});

export default app;