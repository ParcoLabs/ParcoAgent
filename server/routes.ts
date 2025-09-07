// server/routes.ts
import { Router } from "express";

const router = Router();

// ─── Types ─────────────────────────────────────────────────────────────────────
type Category = "Plumbing" | "Electrical" | "HVAC" | "Noise" | "Other";
type Priority = "Low" | "Medium" | "High" | "Urgent";
type Status = "Open" | "In Progress" | "Waiting" | "Resolved";

export type RequestItem = {
  id: string;
  createdAt: string; // ISO
  tenantName: string;
  property: string;
  category: Category;
  priority: Priority;
  status: Status;
  slaDueAt: string; // ISO
  summary: string;
};

// ─── Seed Data ─────────────────────────────────────────────────────────────────
const now = new Date();
const iso = (d: Date) => d.toISOString();
const addHours = (h: number) => {
  const d = new Date();
  d.setTime(now.getTime() + h * 60 * 60 * 1000);
  return d;
};

const REQUESTS: RequestItem[] = [
  {
    id: "REQ-1001",
    createdAt: iso(addHours(-48)),
    tenantName: "Alicia Gomez",
    property: "Maple Grove Apts #3B",
    category: "Plumbing",
    priority: "High",
    status: "Open",
    slaDueAt: iso(addHours(6)),
    summary: "Kitchen sink leaking under cabinet; bucket filling every 2 hours.",
  },
  {
    id: "REQ-1002",
    createdAt: iso(addHours(-36)),
    tenantName: "Marcus Lee",
    property: "Oak Ridge #204",
    category: "HVAC",
    priority: "Urgent",
    status: "In Progress",
    slaDueAt: iso(addHours(2)),
    summary: "AC not cooling during heat wave; thermostat reads 85°F.",
  },
  {
    id: "REQ-1003",
    createdAt: iso(addHours(-20)),
    tenantName: "Priya Patel",
    property: "Lakeview #12",
    category: "Electrical",
    priority: "Medium",
    status: "Waiting",
    slaDueAt: iso(addHours(12)),
    summary: "Living room outlet sparks when plugging in vacuum.",
  },
  {
    id: "REQ-1004",
    createdAt: iso(addHours(-6)),
    tenantName: "Jordan Smith",
    property: "Cedar Court #7A",
    category: "Noise",
    priority: "Low",
    status: "Open",
    slaDueAt: iso(addHours(24)),
    summary: "Upstairs neighbor loud after midnight, recurring for 3 nights.",
  },
  {
    id: "REQ-1005",
    createdAt: iso(addHours(-4)),
    tenantName: "Chen Wang",
    property: "Birch Meadows #8C",
    category: "Other",
    priority: "Medium",
    status: "Resolved",
    slaDueAt: iso(addHours(-1)),
    summary: "Mailbox key replacement request completed by concierge.",
  },
];

// ─── Routes ────────────────────────────────────────────────────────────────────
router.get("/requests", (req, res) => {
  res.json(REQUESTS);
});

export default router;
