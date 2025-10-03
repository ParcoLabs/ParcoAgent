// server/routes.ts
import { Router } from "express";
import { sendEmail } from "./services/email";
import { sendSMS } from "./services/sms";

const router = Router();

// ───────────────────────────────────────────────────────────────────────────────
// Config flags (env)
// In test mode we must send only to our domain. We force the "to" address.
const TEST_MODE = process.env.POSTMARK_TEST_MODE === "true";
const TEST_TO = process.env.POSTMARK_TEST_TO || "operations@parcolabs.com";
const USE_SMS_FOR_VENDOR = process.env.USE_SMS_FOR_VENDOR === "true";
const SMS_DEMO_TO = process.env.SMS_DEMO_TO || ""; // E.164, e.g. +15551234567

const HAS_TWILIO =
  !!process.env.TWILIO_ACCOUNT_SID &&
  !!process.env.TWILIO_AUTH_TOKEN &&
  !!process.env.TWILIO_NUMBER;

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

type AgentDraft = {
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

// ─── Utilities ────────────────────────────────────────────────────────────────
function findRequestById(id: string) {
  return REQUESTS.find((r) => r.id === id);
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// In-file in-memory store for drafts (simple, reliable)
const AGENT_DRAFTS: AgentDraft[] = [];

// ─── Routes (read) ────────────────────────────────────────────────────────────
router.get("/requests", (_req, res) => res.json(REQUESTS));
router.get("/dashboard/stats", (_req, res) => res.json(STATS));
router.get("/category-distribution", (_req, res) => res.json(CATEGORY_DISTRIBUTION));
router.get("/sla-alerts", (_req, res) => res.json(SLA_ALERTS));
router.get("/vendors", (_req, res) => res.json(VENDORS));
router.get("/notifications", (_req, res) => res.json(NOTIFICATIONS));
router.get("/healthz", (_req, res) => res.json({ ok: true }));

// ─── Agent: Run (create drafts) ───────────────────────────────────────────────
router.post("/agent/run", (req, res) => {
  try {
    const { requestId } = req.body as { requestId?: string };
    if (!requestId) return res.status(400).json({ error: "requestId required" });

    const reqItem = findRequestById(requestId);
    const category = (reqItem?.category as string) || "Plumbing";
    const property = reqItem?.property || "Unknown Property / Unit";
    const summary = reqItem?.summary || "New maintenance request.";

    // Real recipients for your demo when NOT in test mode:
    const REAL_TENANT = "yessociety@gmail.com";
    const REAL_VENDOR = "yessociety@gmail.com";

    // Respect Postmark test mode limitations:
    const tenantTo = TEST_MODE ? TEST_TO : REAL_TENANT;

    // Build tenant EMAIL draft
    const tenantDraft: AgentDraft = {
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

    // Decide vendor channel (email or SMS) based on env
    let vendorDraft: AgentDraft;

    const canDoSmsVendor = USE_SMS_FOR_VENDOR && HAS_TWILIO && !!SMS_DEMO_TO;
    if (canDoSmsVendor) {
      // VENDOR SMS DRAFT
      vendorDraft = {
        id: uid(),
        createdAt: iso(new Date()),
        requestId,
        status: "draft",
        kind: "vendor_outreach",
        channel: "sms",
        to: SMS_DEMO_TO,
        body:
          `Parco PM: ${category} issue` +
          (property ? ` at ${property}` : "") +
          `. Can you visit tomorrow 10–12 for diagnosis/repair? Reply Y/N with ETA.`,
        metadata: { property, summary, category },
      };
    } else {
      // Fallback to EMAIL (with test-mode gating)
      const vendorTo = TEST_MODE ? TEST_TO : REAL_VENDOR;
      vendorDraft = {
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
    }

    // Replace any existing drafts for this request to avoid duplicates
    for (let i = AGENT_DRAFTS.length - 1; i >= 0; i--) {
      if (AGENT_DRAFTS[i].requestId === requestId) AGENT_DRAFTS.splice(i, 1);
    }
    AGENT_DRAFTS.push(tenantDraft, vendorDraft);

    res.json({
      ok: true,
      created: [
        { id: tenantDraft.id, channel: tenantDraft.channel },
        { id: vendorDraft.id, channel: vendorDraft.channel },
      ],
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ─── Agent: List drafts for a request ─────────────────────────────────────────
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

// ─── Agent: Approve & send a draft ────────────────────────────────────────────
router.post("/agent/drafts/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const draft = AGENT_DRAFTS.find((d) => d.id === id);
    if (!draft) return res.status(404).json({ error: "draft not found" });

    if (draft.channel === "email") {
      const subject = draft.subject || "Message from Parco PM";
      console.log("[email] sending →", { to: draft.to, subject, testMode: TEST_MODE });
      const result = await sendEmail(draft.to, subject, draft.body);
      if ((result as any).skipped) {
        console.warn("[email] skipped: missing Postmark config (token/from)");
      }
    } else if (draft.channel === "sms") {
      console.log("[sms] sending →", { to: draft.to });
      const result = await sendSMS(draft.to, draft.body);
      if ((result as any).skipped) {
        console.warn("[sms] skipped: missing Twilio config");
      }
    }

    draft.status = "sent";
    res.json({ ok: true, sent: true });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
