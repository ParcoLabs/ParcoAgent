// server/routes.ts
import { Router } from "express";

// Toggle DB mode with env var: USE_DB=true
const USE_DB = String(process.env.USE_DB || "").toLowerCase() === "true";

// Email/SMS services (ESM .js)
import { sendEmail } from "./services/email.js";
import { sendSMS } from "./services/sms.js";

// NEW: LLM compose service
import { composeMessage } from "./services/llm.js";

// In-memory agent storage
import {
  addAgentDrafts,
  listAgentDrafts,
  markAgentDraftSent,
  addAgentRun,
  getAgentDraftById,
  type AgentDraft,
} from "./storage.js";

// Import the new agent function with OpenAI support
import { runAgentForRequest } from "./agent.js";

// If DB mode, load prisma repos (lazy ESM import)
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
  vendorId?: string;
  activity?: Array<{ ts: string; kind: "assign_vendor"; vendorId: string; note: string | null }>;
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

/* ================================ JOBS (mock) ============================== */
type JobStatus = "pending" | "in_progress" | "completed";
type Job = {
  id: string;
  requestId: string;
  vendorId: string;
  status: JobStatus;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  lastMessageAt?: string | null;
  notes?: string[];
};
const JOBS: Job[] = [];

function findRequestById(id: string) {
  // First try to find in REQUESTS
  let request = REQUESTS.find((r) => r.id === id);
  
  // If not found, create a fallback request based on the ID
  if (!request) {
    console.log(`[findRequestById] Request ${id} not found in REQUESTS, creating fallback`);
    
    // Map client IDs to sensible data
    let summary = "Maintenance request";
    let category: Category = "Other";
    let priority: Priority = "Medium";
    let property = "Unknown Unit";
    
    // Handle specific known client IDs
    if (id === "124") {
      summary = "Leak under sink (Unit 3B) - Dripping pipe under kitchen sink";
      category = "Plumbing";
      priority = "High";
      property = "Unit 3B";
    } else if (id === "123") {
      summary = "AC not cooling (Unit 2A) - Air conditioning not working properly";
      category = "HVAC";
      priority = "High";
      property = "Unit 2A";
    }
    
    request = {
      id,
      createdAt: new Date().toISOString(),
      tenantName: "Tenant",
      property,
      category,
      priority,
      status: "Open",
      slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      summary,
    };
  }
  
  return request;
}

function createJobIfNeeded(requestId: string, vendorId: string, note?: string | null) {
  const exists = JOBS.find((j) => j.requestId === requestId && j.vendorId === vendorId);
  if (exists) return exists;
  const job: Job = {
    id: `JOB-${Math.random().toString(36).slice(2, 9)}`,
    requestId,
    vendorId,
    status: "pending",
    createdAt: new Date().toISOString(),
    notes: note ? [note] : [],
  };
  JOBS.push(job);
  return job;
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
  } catch (e) {
    next(e);
  }
});

/** Assign a vendor to a request (simple link + log + create job) */
router.post("/requests/:id/assign-vendor", async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const { vendorId, note } = (req.body ?? {}) as { vendorId?: string; note?: string };
    if (!vendorId) return res.status(400).json({ error: "vendorId required" });

    if (USE_DB && repo && typeof (repo as any).linkVendorToRequest === "function") {
      const result = await (repo as any).linkVendorToRequest(id, vendorId, note ?? null);
      return res.json({ ok: true, result });
    }

    const r = findRequestById(id);
    if (!r) return res.status(404).json({ error: "request not found" });
    r.vendorId = vendorId;
    r.activity = (r.activity ?? []).concat([
      { ts: new Date().toISOString(), kind: "assign_vendor", vendorId, note: note ?? null },
    ]);

    const job = createJobIfNeeded(id, vendorId, note ?? null);
    return res.json({ ok: true, requestId: id, vendorId, job });
  } catch (e) {
    next(e);
  }
});

/* ========================== DRAFTS (DB or Agent) ========================== */
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
      kind: d.kind,
      channel: d.channel,
      to: d.to,
      subject: d.subject ?? undefined,
      body: d.body,
      status: (d.status?.toUpperCase?.() as "DRAFT" | "SENT" | "FAILED") || "DRAFT",
      createdAt: d.createdAt || new Date().toISOString(),
    }));
    return res.json(drafts);
  } catch (e) {
    next(e);
  }
});

/* ========================== AGENT RUN (adds `mode`) ======================= */
router.post("/agent/run", async (req, res) => {
  try {
    const { requestId, mode } = (req.body ?? {}) as {
      requestId?: string;
      mode?: "tenant_update" | "vendor_outreach" | "both";
    };
    if (!requestId) return res.status(400).json({ error: "requestId required" });

    const reqItem = findRequestById(requestId);
    if (!reqItem) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Use the new runAgentForRequest function that supports OpenAI
    const isUsingOpenAI = process.env.USE_REAL_OPENAI === "true";
    console.log(`[API] Running agent for request ${requestId} using ${isUsingOpenAI ? 'OpenAI' : 'Mock LLM'}`);
    
    const result = await runAgentForRequest(requestId, {
      subject: reqItem.summary,
      body: `Category: ${reqItem.category}, Priority: ${reqItem.priority}, Property: ${reqItem.property}, Status: ${reqItem.status}`,
    });

    // The agent run is already logged inside runAgentForRequest
    // The drafts are also already created inside runAgentForRequest
    
    res.json({ 
      ok: true, 
      created: result?.drafts?.length || 0, 
      mode: mode ?? "both",
      model: isUsingOpenAI ? "openai-gpt-4.1-mini" : "mock",
      category: result?.category,
      priority: result?.priority,
      summary: result?.summary,
      usingOpenAI: isUsingOpenAI,
    });
  } catch (e: any) {
    console.error(`[API] Error in /agent/run:`, e);
    res.status(500).json({ error: e.message });
  }
});

router.get("/agent/drafts", (req, res) => {
  try {
    const { requestId } = req.query as { requestId?: string };
    if (!requestId) return res.status(400).json({ error: "requestId required" });
    const drafts = listAgentDrafts(requestId);
    res.json({ ok: true, drafts });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/agent/drafts/:id/approve", async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
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
  } catch (e) {
    next(e);
  }
});

/* ============================== JOB ROUTES (mock) ========================= */
router.get("/jobs", (req, res) => {
  const { vendorId, requestId } = req.query as { vendorId?: string; requestId?: string };
  let rows = [...JOBS];
  if (vendorId) rows = rows.filter((j) => j.vendorId === vendorId);
  if (requestId) rows = rows.filter((j) => j.requestId === requestId);
  res.json(rows);
});

router.post("/jobs/:id/progress", (req, res) => {
  const { id } = req.params as { id: string };
  const { note } = (req.body ?? {}) as { note?: string };
  const job = JOBS.find((j) => j.id === id);
  if (!job) return res.status(404).json({ error: "job not found" });
  if (job.status === "completed") return res.status(400).json({ error: "job already completed" });

  job.status = "in_progress";
  job.startedAt = job.startedAt ?? new Date().toISOString();
  job.notes = (job.notes ?? []).concat(note ? [note] : []);
  res.json({ ok: true, job });
});

router.post("/jobs/:id/complete", (req, res) => {
  const { id } = req.params as { id: string };
  const { note } = (req.body ?? {}) as { note?: string };
  const job = JOBS.find((j) => j.id === id);
  if (!job) return res.status(404).json({ error: "job not found" });

  job.status = "completed";
  job.completedAt = new Date().toISOString();
  job.notes = (job.notes ?? []).concat(note ? [note] : []);
  res.json({ ok: true, job });
});

/* ========================== VENDORS/PROPERTIES (DB or Mock) ================ */
router.get("/vendors", async (_req, res, next) => {
  try {
    if (USE_DB && repo) {
      const rows = await repo.listVendors();
      return res.json(rows);
    }
    return res.json(
      VENDORS.map((v) => ({
        id: v.id,
        name: v.name,
        email: undefined,
        phone: undefined,
        category: (v as any).category || v.trade || "general",
      }))
    );
  } catch (e) {
    next(e);
  }
});

router.get("/properties", async (_req, res, next) => {
  try {
    if (USE_DB && repo) {
      const rows = await repo.listProperties();
      return res.json(rows.map((p) => ({ id: p.id, name: p.name, address: p.address ?? undefined })));
    }
    return res.json([]);
  } catch (e) {
    next(e);
  }
});

/* =============================== WEBHOOK STUBS ============================ */
const DONE_WORDS = ["done", "completed", "finished", "fixed", "resolved"];
function textHasDoneWord(s: string) {
  const t = (s || "").toLowerCase();
  return DONE_WORDS.some((w) => t.includes(w));
}
function extractReqId(s: string): string | null {
  const m = (s || "").match(/REQ[:\s\-]?([A-Za-z0-9\-]+)/i);
  return m?.[1] ? (m[1].startsWith("REQ-") ? m[1] : `REQ-${m[1]}`) : null;
}

router.post("/webhooks/email", (req, res) => {
  const { subject = "", text = "" } = (req.body ?? {}) as { subject?: string; text?: string };
  const reqId = extractReqId(`${subject} ${text}`);
  if (!reqId || !textHasDoneWord(`${subject} ${text}`)) return res.json({ ok: true, ignored: true });
  const job = JOBS.find((j) => j.requestId === reqId);
  if (!job) return res.json({ ok: true, ignored: "no-job" });
  job.status = "completed";
  job.completedAt = new Date().toISOString();
  job.lastMessageAt = new Date().toISOString();
  job.notes = (job.notes ?? []).concat("Auto-completed via email webhook");
  res.json({ ok: true, job });
});

router.post("/webhooks/sms", (req, res) => {
  const { Body = "" } = (req.body ?? {}) as { Body?: string };
  const reqId = extractReqId(Body);
  if (!reqId || !textHasDoneWord(Body)) return res.json({ ok: true, ignored: true });
  const job = JOBS.find((j) => j.requestId === reqId);
  if (!job) return res.json({ ok: true, ignored: "no-job" });
  job.status = "completed";
  job.completedAt = new Date().toISOString();
  job.lastMessageAt = new Date().toISOString();
  job.notes = (job.notes ?? []).concat("Auto-completed via sms webhook");
  res.json({ ok: true, job });
});

/* =========================== LLM COMPOSE ENDPOINT ========================= */
// This is the missing route that the UI (AIComposerModal) and your curl call use.
router.post("/compose/message", async (req, res, next) => {
  try {
    const { target, request, tone } = (req.body ?? {}) as {
      target?: "tenant" | "vendor" | "owner";
      request?: {
        id?: string;
        summary?: string;
        category?: string;
        priority?: string;
        property?: string;
      };
      tone?: string;
    };

    if (!target) return res.status(400).json({ error: "target is required" });

    const out = await composeMessage({
      target,
      request: {
        id: request?.id,
        summary: request?.summary,
        category: request?.category,
        priority: request?.priority,
        property: request?.property,
      },
      tone: tone ?? "neutral",
    });

    res.json(out);
  } catch (e) {
    next(e);
  }
});

// --- Vendor Jobs (mock aggregator) ------------------------------------------
router.get("/vendor-jobs", async (_req, res, next) => {
  try {
    if (USE_DB && repo && typeof (repo as any).listVendorJobs === "function") {
      const rows = await (repo as any).listVendorJobs();
      return res.json(rows);
    }
    const byId = new Map(VENDORS.map(v => [v.id, v]));
    const jobs = REQUESTS
      .filter(r => !!r.vendorId)
      .map(r => ({
        id: `JOB-${r.id}`,
        requestId: r.id,
        vendorId: r.vendorId!,
        vendorName: byId.get(r.vendorId!)?.name || "Vendor",
        title: r.summary || r.category || "Request",
        category: r.category,
        priority: r.priority,
        status: r.status,
        property: r.property,
        createdAt: r.createdAt,
        lastActivityAt: r.activity?.at(-1)?.ts ?? r.createdAt,
        note: r.activity?.at(-1)?.note ?? null,
      }));

    res.json(jobs);
  } catch (e) {
    next(e);
  }
});

export default router;
