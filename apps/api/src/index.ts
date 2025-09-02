import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Vendors (sample)
app.get("/api/vendors", (_req, res) => {
  res.json([
    { id: "v-plumbfast", name: "PlumbFast Co.", category: "Plumbing" },
    { id: "v-hvacpro", name: "HVAC Pro Team", category: "HVAC" }
  ]);
});

// Analytics KPIs (sample)
app.get("/api/analytics/kpis", (_req, res) => {
  res.json({
    occupancyPct: 92,
    avgRent: 2145,
    capRate: 6.1,
    ttmNOI: 832000,
    slaHitPct: 86,
    avgResponseHrs: 2.8,
    costPerWO: 487,
    compliancePct: 78,
    backlog7: 9,
    backlog30: 3
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
