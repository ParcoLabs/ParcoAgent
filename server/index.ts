// server/index.ts
import express from "express";
import cors from "cors";
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

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
app.listen(PORT, () => {
  console.log(`[express] serving on port ${PORT}`);
});

export default app;
