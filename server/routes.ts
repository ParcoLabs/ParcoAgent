// server/routes.ts
import { Router } from "express";
import {
  getSettings,
  updateProperty,
  updateChannels,
  addVendor,
  updateSla,
  updateRent,
  importTenants,
} from "./storage";

const router = Router();

// Simple API key check (optional during dev)
const API_KEY = process.env.API_KEY || "";
router.use((req, res, next) => {
  if (!API_KEY) return next(); // no key required in dev unless set
  const key = req.header("x-api-key");
  if (key !== API_KEY) return res.status(401).json({ error: "Unauthorized" });
  next();
});

// Health
router.get("/healthz", (_req, res) => res.json({ ok: true }));

// Dashboard stats endpoint
router.get("/dashboard/stats", (_req, res) => {
  res.json({
    activeRequests: 12,
    urgentIssues: 3,
    slaCompliance: 94,
    avgResolutionDays: 2.1
  });
});

// Notifications endpoint
router.get("/notifications", (_req, res) => {
  res.json([
    {
      id: 1,
      message: "New maintenance request for Unit 12A",
      type: "urgent",
      timestamp: new Date().toISOString()
    },
    {
      id: 2,
      message: "SLA compliance threshold reached",
      type: "warning",
      timestamp: new Date().toISOString()
    },
    {
      id: 3,
      message: "Monthly report available",
      type: "info",
      timestamp: new Date().toISOString()
    }
  ]);
});

// Settings - read
router.get("/settings", (_req, res) => {
  res.json(getSettings());
});

// PUT /settings/property
router.put("/settings/property", (req, res) => {
  const { name, address, type, unitCount, rentCycle } = req.body || {};
  updateProperty({
    name: name ?? null,
    address: address ?? null,
    type: type ?? null,
    unitCount:
      typeof unitCount === "number" && !Number.isNaN(unitCount) ? unitCount : null,
    rentCycle: rentCycle ?? "Monthly",
  });
  res.json({ ok: true });
});

// POST /settings/tenants/import
router.post("/settings/tenants/import", (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const result = importTenants(rows);
  res.json(result);
});

// PUT /settings/channels
router.put("/settings/channels", (req, res) => {
  const { gmail, sms, portalEnabled } = req.body || {};
  updateChannels({
    gmail: { connected: Boolean(gmail?.connected) },
    sms: { connected: Boolean(sms?.connected) },
    portalEnabled: Boolean(portalEnabled),
  });
  res.json({ ok: true });
});

// POST /settings/vendors
router.post("/settings/vendors", (req, res) => {
  const { name, email, phone, type, serviceArea } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });
  const vendor = addVendor({
    name,
    email: email ?? null,
    phone: phone ?? null,
    type: type ?? null,
    serviceArea: serviceArea ?? null,
  });
  res.json(vendor);
});

// PUT /settings/sla
router.put("/settings/sla", (req, res) => {
  const rules = req.body?.rules;
  const leak = Number(rules?.leakHours ?? 4);
  const noHeat = Number(rules?.noHeatHours ?? 6);
  const normal = Number(rules?.normalHours ?? 48);
  updateSla({ rules: { leakHours: leak, noHeatHours: noHeat, normalHours: normal } });
  res.json({ ok: true });
});

// PUT /settings/rent
router.put("/settings/rent", (req, res) => {
  const { dueDay, lateFeePercent, reminderCadence } = req.body || {};
  const payload: any = {};
  if (dueDay !== undefined) payload.dueDay = Number(dueDay);
  if (lateFeePercent !== undefined) payload.lateFeePercent = Number(lateFeePercent);
  if (reminderCadence !== undefined) payload.reminderCadence = String(reminderCadence);
  updateRent(payload);
  res.json({ ok: true });
});

export default router;
