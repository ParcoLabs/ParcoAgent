// server/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import routes from "./routes.js";
import { setupVite } from "./vite.js";

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

// Attach Vite (middleware in dev, static in prod)
setupVite(app, server).then(() => {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[express] serving on port ${PORT}`);
  });
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
