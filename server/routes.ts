// server/routes.ts
import { Router } from "express";
import { sendEmail } from "./services/email";
import { sendSMS } from "./services/sms";

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

// A minimal draft type for our in-file store
type AgentDraftLite = {
  id: string;
  createdAt: string; // ISO
  requestId: string;
  status: "draft" | "sent";
  kind: "tenant_reply" | "vendor_outreach";
  channel: "email" | "sms";
  to: string;
  subject?: string | null;
  body: string;
  vendorId?: string;
  metadata?: Record<string, any>;
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
  avgResolutionDays: 2.4,
};

const CATEGORY_DISTRIBUTION = [
  { category: "Plumbing", percentage: 35 },
  { category: "HVAC", percentage: 28 },
  { category: "Electrical", percentage: 20 },
  { category: "Noise", percentage: 12 },
  { category: "Other", percentage: 5 },
];

const SLA_ALERTS = [
  {
    id: "SLA-001",
    propertyAddress: "Maple Grove Apts #3B",
    category: "Plumbing",
    priority: "urgent",
    hoursLeft: 2,
  },
  {
    id: "SLA-002",
    propertyAddress: "Oak Ridge #204",
    category: "HVAC",
    priority: "urgent",
    hoursLeft: 1,
  },
];

const VENDORS = [
  { id: "V001", name: "AquaFix Pro", trade: "Plumbing", rating: 4.8, jobsCompleted: 247 },
  { id: "V002", name: "CoolAir Masters", trade: "HVAC", rating: 4.6, jobsCompleted: 189 },
  { id: "V003", name: "Bright Electric", trade: "Electrical", rating: 4.9, jobsCompleted: 156 },
];

const NOTIFICATIONS = [
  {
    id: "N001",
    message: "3 urgent requests require immediate attention",
    type: "urgent",
    timestamp: iso(addHours(-1)),
  },
  {
    id: "N002",
    message: "SLA deadline approaching for 2 requests",
    type: "warning",
    timestamp: iso(addHours(-2)),
  },
];

// ─── Utility ───────────────────────────────────────────────────────────────────
function findRequestById(id: string) {
  return REQUESTS.find((r) => r.id === id);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// In-memory agent draft store (simple and reliable for demo)
const AGENT_DRAFTS: AgentDraftLite[] = [];

// ─── Routes (existing) ────────────────────────────────────────────────────────
router.get("/requests", (_req, res) => res.json(REQUESTS));
router.get("/dashboard/stats", (_req, res) => res.json(STATS));
router.get("/category-distribution", (_req, res) => res.json(CATEGORY_DISTRIBUTION));
router.get("/sla-alerts", (_req, res) => res.json(SLA_ALERTS));
router.get("/vendors", (_req, res) => res.json(VENDORS));
router.get("/notifications", (_req, res) => res.json(NOTIFICATIONS));

// Health
router.get("/healthz", (_req, res) => res.json({ ok: true }));

// ─── Agent endpoints (assistive mode) ─────────────────────────────────────────
// PERMISSIVE: works for any requestId (numeric or REQ-****)
router.post("/agent/run", async (req, res) => {
  try {
    const { requestId } = req.body as { requestId?: string };
    if (!requestId) return res.status(400).json({ error: "requestId required" });

    const reqItem = findRequestById(requestId); // ok if undefined
    const category = (reqItem?.category as string) || "Plumbing";
    const property = reqItem?.property || "Unknown Property / Unit";
    const summary =
      reqItem?.summary ||
      "New maintenance request received. Details not available in seed data.";

    // For your demo, set these to your addresses/numbers if you want to receive them
    const tenantTo = "tenant@example.com";
    const vendorTo = category === "Plumbing" ? "plumber@example.com" : "vendor@example.com";

    const tenantDraft: AgentDraftLite = {
      id: uid(),
      createdAt: iso(new Date()),
      requestId,
      status: "draft",
      kind: "tenant_reply",
      channel: "email",
      to: tenantTo,
      subject: `We're on it: ${category}`,
      body:
        "Thanks for reporting this. We’ve logged your request and will arrange a vendor visit. Reply here if anything changes.",
      metadata: { summary, category, priority: reqItem?.priority || "Medium" },
    };

    const vendorDraft: AgentDraftLite = {
      id: uid(),
      createdAt: iso(new Date()),
      requestId,
      status: "draft",
      kind: "vendor_outreach",
      channel: "email",
      to: vendorTo,
      subject: `Service request at ${property}`,
      body:
        "Please confirm availability tomorrow 10–12 for diagnosis/repair. Reply to confirm and include any materials/ETA.",
      metadata: { property, summary, category },
    };

    // Store drafts for this request
    AGENT_DRAFTS.push(tenantDraft, vendorDraft);

    res.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// List drafts for a request
router.get("/agent/drafts", (req, res) => {
  try {
    const { requestId } = req.query as { requestId?: string };
    if (!requestId) return res.status(400).json({ error: "requestId required" });

    const drafts = AGENT_DRAFTS.filter((d) => d.requestId === requestId);
    res.json({ ok: true, drafts });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Approve (send) a draft
router.post("/agent/drafts/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const draft = AGENT_DRAFTS.find((d) => d.id === id);
    if (!draft) return res.status(404).json({ error: "draft not found" });

    // Actually send
    if (draft.channel === "email") {
      const subject = draft.subject || "Message from Parco PM";
      const result = await sendEmail(draft.to, subject, draft.body);
      if ((result as any).skipped) {
        console.warn("[approve] Email skipped (missing Postmark config)");
      }
    } else if (draft.channel === "sms") {
      const result = await sendSMS(draft.to, draft.body);
      if ((result as any).skipped) {
        console.warn("[approve] SMS skipped (missing Twilio config)");
      }
    }

    // Mark as sent in our in-memory store
    draft.status = "sent";

    res.json({ ok: true, sent: true });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
