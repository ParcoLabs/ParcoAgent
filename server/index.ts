// server/index.ts
import express from "express";
import cors from "cors";
import { createServer } from "http";
import routes from "./routes";
import { setupVite } from "./vite";

const app = express();

// CORS: allow your frontend during dev
app.use(
  cors({
    origin: true,
    credentials: false,
  })
);

app.use(express.json({ limit: "5mb" }));

// Mount API
app.use("/api", routes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const server = createServer(app);

// Setup Vite to serve the frontend
setupVite(app, server).then(() => {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[express] serving on port ${PORT}`);
  });
});

export default app;
