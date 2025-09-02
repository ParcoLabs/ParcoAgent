// server/index-fixed.ts
import express from "express";
import cors from "cors";
import { createServer } from "http";
import routes from "./routes";

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

// Serve the frontend in development mode
if (process.env.NODE_ENV !== "production") {
  // Simple static file serving for the frontend
  app.use(express.static("client"));
  app.get("*", (req, res) => {
    res.sendFile("index.html", { root: "client" });
  });
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const server = createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[express] serving on port ${PORT}`);
});

export default app;