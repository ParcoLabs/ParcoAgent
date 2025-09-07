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

// ─── Mock Data for Additional Endpoints ────────────────────────────────────────

const STATS = {
  activeRequests: 15,
  urgentIssues: 3,
  slaCompliance: 92,
  avgResolutionDays: 2.4
};

const CATEGORY_DISTRIBUTION = [
  { category: "Plumbing", percentage: 35 },
  { category: "HVAC", percentage: 28 },
  { category: "Electrical", percentage: 20 },
  { category: "Noise", percentage: 12 },
  { category: "Other", percentage: 5 }
];

const SLA_ALERTS = [
  {
    id: "SLA-001",
    propertyAddress: "Maple Grove Apts #3B",
    category: "Plumbing",
    priority: "urgent",
    hoursLeft: 2
  },
  {
    id: "SLA-002", 
    propertyAddress: "Oak Ridge #204",
    category: "HVAC",
    priority: "urgent", 
    hoursLeft: 1
  }
];

const VENDORS = [
  {
    id: "V001",
    name: "AquaFix Pro",
    trade: "Plumbing",
    rating: 4.8,
    jobsCompleted: 247
  },
  {
    id: "V002",
    name: "CoolAir Masters", 
    trade: "HVAC",
    rating: 4.6,
    jobsCompleted: 189
  },
  {
    id: "V003",
    name: "Bright Electric",
    trade: "Electrical", 
    rating: 4.9,
    jobsCompleted: 156
  }
];

const NOTIFICATIONS = [
  {
    id: "N001",
    message: "3 urgent requests require immediate attention",
    type: "urgent",
    timestamp: iso(addHours(-1))
  },
  {
    id: "N002", 
    message: "SLA deadline approaching for 2 requests",
    type: "warning",
    timestamp: iso(addHours(-2))
  }
];

// ─── Routes ────────────────────────────────────────────────────────────────────
router.get("/requests", (req, res) => {
  res.json(REQUESTS);
});

router.get("/dashboard/stats", (req, res) => {
  res.json(STATS);
});

router.get("/category-distribution", (req, res) => {
  res.json(CATEGORY_DISTRIBUTION);
});

router.get("/sla-alerts", (req, res) => {
  res.json(SLA_ALERTS);
});

router.get("/vendors", (req, res) => {
  res.json(VENDORS);
});

router.get("/notifications", (req, res) => {
  res.json(NOTIFICATIONS);
});

export default router;
