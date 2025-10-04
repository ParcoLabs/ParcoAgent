import { Router } from "express";

// Toggle DB mode with env var: USE_DB=true
const USE_DB = String(process.env.USE_DB || "").toLowerCase() === "true";

// Email/SMS services
import { sendEmail } from "./services/email.js";
import { sendSMS } from "./services/sms.js";

// In-memory agent storage (your existing module)
import {
  addAgentDrafts,
  listAgentDrafts,
  markAgentDraftSent,
  addAgentRun,
  getAgentDraftById,
  type AgentDraft,
} from "./storage.js";

// If DB mode, load prisma repos
let repo: null | typeof import("./db/repos.js") = null;
if (USE_DB) {
  repo = await import("./db/repos.js");
}

const router = Router();

/* ========================== MOCK/EXISTING DATA ============================ */
type Category = "Plumbing" | "Electrical" | "HVAC" | "Noise" | "Other";
type Priority = "Low" | "Medium" | "High" | "Urgent";
type Status = "Open" | "In Progress" | "Waiting" | "Resolved";

export type RequestItem = {
  id: string;
  createdAt: string;
  tenantName: string;
  property: string;
  category: Category;
  priority: Priority;
  status: Status;
  slaDueAt: string;
  summary: string;
};

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

const STATS = { activeRequests: 15, urgentIssues: 3, slaCompliance: 92, avgResolutionDays: 2.4 };
const CATEGORY_DISTRIBUTION = [
  { category: "Plumbing", percentage: 35 },
  { category: "HVAC", percentage: 28 },
  { category: "Electrical", percentage: 20 },
  { category: "Noise", percentage: 12 },
  { category: "Other", percentage: 5 },
];
const SLA_ALERTS = [
  { id: "SLA-001", propertyAddress: "Maple Grove Apts #3B", category: "Plumbing", priority: "urgent", hoursLeft: 2 },
  { id: "SLA-002", propertyAddress: "Oak Ridge #204", category: "HVAC", priority: "urgent", hoursLeft: 1 },
];
const VENDORS = [
  { id: "V001", name: "AquaFix Pro", trade: "Plumbing", rating: 4.8, jobsCompleted: 247 },
  { id: "V002", name: "CoolAir Masters", trade: "HVAC", rating: 4.6, jobsCompleted: 189 },
  { id: "V003", name: "Bright Electric", trade: "Electrical", rating: 4.9, jobsCompleted: 156 },
];

const NOTIFICATIONS = [
  { id: "N001", message: "3 urgent requests require immediate attention", type: "urgent", timestamp: iso(addHours(-1)) },
  { id: "N002", message: "SLA deadline approaching for 2 requests", type: "warning", timestamp: iso(addHours(-2)) },
];

function findRequestById(id: string) {
  return REQUESTS.find((r) => r.id === id);
}

/* ========================== ANALYTICS + MOCK ROUTES ======================== */
router.get("/dashboard/stats", (_req, res) => res.json(STATS));
router.get("/category-distribution", (_req, res) => res.json(CATEGORY_DISTRIBUTION));
router.get("/sla-alerts", (_req, res) => res.json(SLA_ALERTS));
router.get("/notifications", (_req, res) => res.json(NOTIFICATIONS));
router.get("/healthz", (_req, res) => res.json({ ok: true }));

/* ========================== REQUESTS (DB or Mock) ========================== */
router.get("/requests", async (_req, res, next) => {
  try {
    if (USE_DB && repo) {
      const data = await repo.listRequests();
      return res.json(data);
    }
    return res.json(REQUESTS);
  } catch (e) { next(e); }
});

/* ========================== DRAFTS (DB or Agent) ========================== */
// List all drafts (DB) or aggregate from in-memory agent drafts (fallback)
router.get("/drafts", async (_req, res, next) => {
  try {
    if (USE_DB && repo) {
      const data = await repo.listDrafts();
      return res.json(data);
    }
    const requestIds = REQUESTS.map((r) => r.id);
    const all = requestIds.flatMap((id) => listAgentDrafts(id) ?? []);
    const drafts = all.map((d) => ({
      id: d.id,
      requestId: d.requestId,
      channel: d.channel === "sms" ? "SMS" : "EMAIL",
      to: d.to,
      subject: d.subject ?? undefined,
      body: d.body,
      status: d.status?.toUpperCase?.() || "PENDING",
      createdAt: d.createdAt || new Date().toISOString(),
    }));
    return res.json(drafts);
  } catch (e) { next(e); }
});

// Your existing agent run: generates drafts in memory
router.post("/agent/run", async (req, res) => {
  try {
    const { requestId } = req.body as { requestId?: string };
    if (!requestId) return res.status(400).json({ error: "requestId required" });

    const reqItem = findRequestById(requestId);

    addAgentRun({ requestId, status: "success", model: "mock", tokensIn: 0, tokensOut: 0, error: null });

    const category = (reqItem?.category as string) || "Plumbing";
    const property = reqItem?.property || "Unknown Property / Unit";
    const summary = reqItem?.summary || "New maintenance request received. Details not available in seed data.";
    const TEST_EMAIL = "yessociety@gmail.com";

    const tenantDraft: Omit<AgentDraft, "id" | "createdAt" | "status"> = {
      requestId, kind: "tenant_reply", channel: "email", to: TEST_EMAIL,
      subject: `We're on it: ${category}`,
      body: "Thanks for reporting this. We’ve logged your request and will arrange a vendor visit. Reply here if anything changes.",
      vendorId: null, metadata: { summary, category, priority: reqItem?.priority || "Medium" },
    };

    const vendorDraft: Omit<AgentDraft, "id" | "createdAt" | "status"> = {
      requestId, kind: "vendor_outreach", channel: "email", to: TEST_EMAIL,
      subject: `Service request at ${property}`,
      body: "Please confirm availability tomorrow 10–12 for diagnosis/repair. Reply to confirm and include any materials/ETA.",
      vendorId: undefined, metadata: { property, summary, category },
    };

    addAgentDrafts(requestId, [tenantDraft, vendorDraft]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Agent drafts by requestId (kept for backwards compatibility)
router.get("/agent/drafts", (req, res) => {
  try {
    const { requestId } = req.query as { requestId?: string };
    if (!requestId) return res.status(400).json({ error: "requestId required" });
    const drafts = listAgentDrafts(requestId);
    res.json({ ok: true, drafts });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Approve: DB path (if enabled) else in-memory send + mark sent
router.post("/agent/drafts/:id/approve", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (USE_DB && repo) {
      const result = await repo.approveAndSendDraft(id);
      return res.json(result);
    }
    const draft = getAgentDraftById(id);
    if (!draft) return res.status(404).json({ error: "draft not found" });

    if (draft.channel === "email") {
      const subject = draft.subject || "Message from Parco PM";
      const result = await sendEmail(draft.to, subject, draft.body);
      if ((result as any).skipped) console.warn("[approve] Email skipped (missing Postmark config)");
    } else if (draft.channel === "sms") {
      const result = await sendSMS(draft.to, draft.body);
      if ((result as any).skipped) console.warn("[approve] SMS skipped (missing Twilio config)");
    }

    const ok = markAgentDraftSent(id);
    if (!ok) return res.status(404).json({ error: "draft not found after send" });
    res.json({ ok: true, sent: true });
  } catch (e) { next(e); }
});

/* ========================== VENDORS/PROPERTIES (DB or Mock) ================ */
router.get("/vendors", async (_req, res, next) => {
  try {
    if (USE_DB && repo) {
      const rows = await repo.listVendors();
      return res.json(rows);
    }
    return res.json(VENDORS);
  } catch (e) { next(e); }
});

router.get("/properties", async (_req, res, next) => {
  try {
    if (USE_DB && repo) {
      const rows = await repo.listProperties();
      return res.json(rows.map((p) => ({ id: p.id, name: p.name, address: p.address ?? undefined })));
    }
    return res.json([]); // no mock list here, keep shape stable
  } catch (e) { next(e); }
});

export default router;
