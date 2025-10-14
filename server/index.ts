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

/* -------------------------------------------------------------------------- */
/*  OpenAI env detection (supports Replit integration OR .env OPENAI_API_KEY)  */
/* -------------------------------------------------------------------------- */

const replitKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim();
const replitBase = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim();
const dotEnvKey = process.env.OPENAI_API_KEY?.trim();

// If Replit integration provided a key but OPENAI_API_KEY is not set, copy it over.
if (!dotEnvKey && replitKey) {
  process.env.OPENAI_API_KEY = replitKey;
  if (replitBase) {
    // If you have a custom base URL from Replit, expose it as OPENAI_BASE_URL (optional).
    process.env.OPENAI_BASE_URL = replitBase;
  }
}

const hasOpenAI = !!process.env.OPENAI_API_KEY;
if (hasOpenAI) {
  process.env.USE_REAL_OPENAI = "true";
  console.log("[OpenAI] ✅ Enabled — using OPENAI_API_KEY", replitKey ? "(from Replit integration)" : "(from .env)");
  if (process.env.OPENAI_BASE_URL) {
    console.log("[OpenAI] Base URL:", process.env.OPENAI_BASE_URL);
  }
} else {
  console.log("[OpenAI] ❌ No API key detected — using mock responses");
}

/* ------------------------------ Express setup ----------------------------- */

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

// Replit provides PORT (commonly 3000). Fall back to 5000 for local.
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

  // Print a concise env summary so you can verify on every boot
  console.log("[env] summary:", {
    NODE_ENV: process.env.NODE_ENV,
    PORT,
    USE_REAL_OPENAI: process.env.USE_REAL_OPENAI,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY, // boolean only
    OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  });

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
