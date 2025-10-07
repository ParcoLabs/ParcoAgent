// server/index.ts
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import routes from "./routes.js"; // IMPORTANT: keep .js (ESM)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* Logger */
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} ${Date.now() - t0}ms`);
  });
  next();
});

app.use(express.json());

/* API */
app.use("/api", routes);

/* Static SPA (auto-build if missing) */
const clientRoot = path.resolve(__dirname, "../client");
const clientDist = path.join(clientRoot, "dist");

async function ensureClientBuilt() {
  if (fs.existsSync(clientDist)) return;
  console.log("[server] client/dist not found — building frontend with Vite…");
  const vite = await import("vite");
  await vite.build({
    root: clientRoot,
    configFile: path.resolve(__dirname, "../vite.config.ts"),
    logLevel: "info",
  });
  console.log("[server] Frontend build complete.");
}

try {
  await ensureClientBuilt();
} catch (err: any) {
  console.error("[server] Frontend build failed:", err?.message || err);
}

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
  console.log("[server] Serving client from /client/dist (static mode)");
} else {
  console.warn("[server] WARNING: client/dist not found. The frontend will 404 until built.");
}

/* Health */
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

/* Error handler */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[error]", err);
  res.status(500).json({ error: "Internal Server Error" });
});

/* Optional seed */
try {
  const mod =
    (await import("./db/seed.js").catch(() => null)) ??
    (await import("./db/seed.ts").catch(() => null));
  if (mod?.seedDemo) {
    await mod.seedDemo();
    console.log("✅ Seed complete (demo).");
  } else if (mod?.main) {
    await mod.main();
    console.log("✅ Seed complete (prisma).");
  } else {
    console.log("[server] No seed module found — continuing without seeding.");
  }
} catch (e: any) {
  console.warn("[server] Seed skipped:", e?.message || e);
}

/* Listen — Replit requires PORT */
const PORT = Number(process.env.PORT) || 3000;
const server = app.listen(PORT, "0.0.0.0", () => {
  // @ts-ignore
  const addr = server.address();
  const actual = typeof addr === "string" ? addr : `http://localhost:${addr?.port ?? PORT}`;
  console.log(`[server] listening on ${actual}`);
});
