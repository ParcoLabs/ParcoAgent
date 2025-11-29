import { Router } from "express";

// Toggle DB mode with env var: USE_DB=true
const USE_DB = String(process.env.USE_DB || "").toLowerCase() === "true";

// Email/SMS services (ESM .js)
import { sendEmail } from "./services/email.js";
import { sendSMS } from "./services/sms.js";

// LLM compose service
import { composeMessage } from "./services/llm.js";

// Daily Brief
import { buildDailyBrief, emailDailyBrief } from "./actions/dailyBrief.js";

// In-memory agent storage
import {
  addAgentDrafts,
  listAgentDrafts,
  markAgentDraftSent,
  getAgentDraftById,
  type AgentDraft,
  resetAgentStorage,

  // audit helpers
  addAudit,
  listAudit,
  resetAuditLog,
} from "./storage.js";

// Agent (OpenAI / mock)
import { runAgentForRequest } from "./agent.js";

// Source 3 Quotes action (ranking/picks)
import { sourceQuotes } from "./actions/sourceQuotes.js";

// 🚀 PM chat brain (TS file, import with .js for ESM)
import { pmChatRespond } from "./agent/pmChat.js";

// Optional DB repo (kept ESM .js path; works with tsx)
let repo: null | typeof import("./db/repos.js") = null;
if (USE_DB) {
  try {
    repo = await import("./db/repos.js");
  } catch (err) {
    console.error("[routes] Failed to load DB repo; continuing with mocks:", err);
    repo = null;
  }
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
  property: string; // name string in mocks
  category: Category;
  priority: Priority;
  status: Status;
  slaDueAt: string;
  summary: string;
  vendorId?: string;
  activity?: Array<{ ts: string; kind: "assign_vendor"; vendorId: string; note: string | null }>;
};

const nowRef = new Date();
const iso = (d: Date) => d.toISOString();
const addHours = (h: number) => {
  const d = new Date();
  d.setTime(nowRef.getTime() + h * 60 * 60 * 1000);
  return d;
};

// — seed so we can rebuild for Demo Reset —
function seedRequests(): RequestItem[] {
  return [
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
}
let REQUESTS: RequestItem[] = seedRequests();

/* ------------------------- In-memory Properties store ---------------------- */
type PropertyRow = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  type?: string;
  status?: string;
  units?: number;
  unitsTotal?: number;
  occ?: number;
  occupancyPct?: number;
  noiTtm?: number;
  ttmNOI?: number;
  yearBuilt?: number | null;
  owner?: string | null;
  avgRent?: number | null;
  propertyClass?: string | null;
};

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 32);

function seedProperties(): PropertyRow[] {
  return [
    { id: "225-pine", name: "225 Pine St", address: "San Francisco, CA • Multifamily", units: 24, occ: 92, noiTtm: 418_000 },
    { id: "456-oak",  name: "456 Oak Ave", address: "Austin, TX • Multifamily",       units: 8,  occ: 100, noiTtm: 181_000 },
    { id: "12-maple", name: "12 Maple Ct", address: "Miami, FL • Mixed Use",           units: 16, occ: 88,  noiTtm: 233_000 },
  ];
}
let PROPERTIES_STORE: PropertyRow[] = seedProperties();

/* ------------------------------ Dashboard mocks ---------------------------- */
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
  { id: "V001", name: "AquaFix Pro",    trade: "Plumbing",   rating: 4.8, jobsCompleted: 247 },
  { id: "V002", name: "CoolAir Masters", trade: "HVAC",       rating: 4.6, jobsCompleted: 189 },
  { id: "V003", name: "Bright Electric", trade: "Electrical", rating: 4.9, jobsCompleted: 156 },
];
const NOTIFICATIONS = [
  { id: "N001", message: "3 urgent requests require immediate attention", type: "urgent",  timestamp: iso(addHours(-1)) },
  { id: "N002", message: "SLA deadline approaching for 2 requests",       type: "warning", timestamp: iso(addHours(-2)) },
];

/* ================================ JOBS (mock) ============================== */
type JobStatus = "pending" | "in_progress" | "completed";
type JobVisit = { when: string; window?: string; note?: string };
type JobProof = { url?: string | null; note?: string | null; addedAt: string } | null;
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
  visit?: JobVisit | null;
  proof?: JobProof;
};
const JOBS: Job[] = [];

/* ================================ PROSPECTS ================================ */
type Prospect = {
  id: string;
  requestId: string;
  vendorId: string;
  vendorName: string;
  trade?: string | null;
  email?: string | null;
  phone?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  note?: string | null;
  estimatedCost?: number | null;
};
const PROSPECTS: Prospect[] = [];

/* ----------------------------- helpers ------------------------------------ */
function findRequestById(id: string) {
  let request = REQUESTS.find((r) => r.id === id);
  if (!request) {
    let summary = "Maintenance request";
    let category: Category = "Other";
    let priority: Priority = "Medium";
    let property = "Unknown Unit";
    if (id === "124") { summary = "Leak under sink (Unit 3B) - Dripping pipe under kitchen sink"; category = "Plumbing"; priority = "High"; property = "Unit 3B"; }
    else if (id === "123") { summary = "AC not cooling (Unit 2A) - Air conditioning not working properly"; category = "HVAC"; priority = "High"; property = "Unit 2A"; }
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
    REQUESTS.push(request);
  }
  return request;
}

function createJobIfNeeded(
  requestId: string,
  vendorId: string,
  note?: string | null,
  allowDuplicate = false
) {
  if (!allowDuplicate) {
    const exists = JOBS.find((j) => j.requestId === requestId && j.vendorId === vendorId);
    if (exists) return exists;
  }
  const job: Job = {
    id: `JOB-${Math.random().toString(36).slice(2, 9)}`,
    requestId,
    vendorId,
    status: "pending",
    createdAt: new Date().toISOString(),
    notes: note ? [note] : [],
    visit: null,
    proof: null,
  };
  JOBS.push(job);
  return job;
}

/* ========================== ANALYTICS + MOCK ROUTES ======================== */
router.get("/dashboard/stats", (_req, res) => { try { res.json(STATS); } catch { res.json(STATS); } });
router.get("/category-distribution", (_req, res) => { try { res.json(CATEGORY_DISTRIBUTION); } catch { res.json(CATEGORY_DISTRIBUTION); } });
router.get("/sla-alerts", (_req, res) => { try { res.json(SLA_ALERTS); } catch { res.json(SLA_ALERTS); } });
router.get("/notifications", (_req, res) => { try { res.json(NOTIFICATIONS); } catch { res.json(NOTIFICATIONS); } });
router.get("/healthz", (_req, res) => res.json({ ok: true }));

// 🔍 NEW: LLM health check, so curl /api/healthz/llm returns JSON, not Vite bundle
router.get("/healthz/llm", async (_req, res) => {
  try {
    const out = await composeMessage({
      system: "You answer with one short sentence.",
      messages: [{ role: "user", content: "Say OK if you are alive." }],
      temperature: 0.2,
    } as any);

    const reply = (out as any)?.content ?? out;
    res.json({ ok: true, reply });
  } catch (e: any) {
    console.error("[/healthz/llm] error:", e?.message || e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

/* ============================== DAILY BRIEF ================================ */
router.get("/agent/daily-brief", async (_req, res, next) => {
  try {
    const brief = buildDailyBrief({ REQUESTS, JOBS, PROSPECTS, NOTIFICATIONS });
    res.json({ ok: true, brief });
  } catch (e) { next(e); }
});

router.post("/agent/daily-brief/email", async (req, res, next) => {
  try {
    const { to } = (req.body ?? {}) as { to?: string };
    if (!to) return res.status(400).json({ error: "to required" });
    const brief = buildDailyBrief({ REQUESTS, JOBS, PROSPECTS, NOTIFICATIONS });
    const subject = "Parco PM — Daily Brief";
    const result = await emailDailyBrief({ to, briefText: brief.text, subject });
    res.json({ ok: true, sent: true, result });
  } catch (e) { next(e); }
});

/* ========================== REQUESTS (DB or Mock) ========================== */
router.get("/requests", async (_req, res) => {
  if (USE_DB && repo) {
    try {
      const data = await (repo as any).listRequests?.();
      return res.json(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[/requests] DB failed, using in-memory:", err);
    }
  }
  return res.json(REQUESTS);
});

/** Create a request (manual entry from UI) — ADDED */
router.post("/requests", async (req, res) => {
  try {
    const body = (req.body ?? {}) as {
      summary?: string;
      category?: Category;
      priority?: Priority;
      property?: string;
      tenantName?: string;
    };

    if (USE_DB && repo && typeof (repo as any).createRequest === "function") {
      try {
        const row = await (repo as any).createRequest({
          summary: body.summary ?? "New maintenance request",
          category: body.category ?? "Other",
          priority: body.priority ?? "Medium",
          property: body.property ?? "Unknown Unit",
          tenantName: body.tenantName ?? "Tenant",
        });
        addAudit({ actor: "pm", action: "create-request", requestId: row.id, meta: { summary: row.summary } });
        return res.json(row);
      } catch (err) {
        console.error("[POST /requests] DB failed, using memory:", err);
      }
    }

    const item: RequestItem = {
      id: `REQ-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
      tenantName: String(body.tenantName || "Tenant"),
      property: String(body.property || "Unknown Unit"),
      category: (body.category as Category) || "Other",
      priority: (body.priority as Priority) || "Medium",
      status: "Open",
      slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      summary: String(body.summary || "New maintenance request"),
    };
    REQUESTS.unshift(item);
    addAudit({ actor: "pm", action: "create-request", requestId: item.id, meta: { summary: item.summary } });
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "create failed" });
  }
});

/** Assign a vendor to a request (link + log + create job) */
router.post("/requests/:id/assign-vendor", async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const { vendorId, note } = (req.body ?? {}) as { vendorId?: string; note?: string };
    if (!vendorId) return res.status(400).json({ error: "vendorId required" });

    if (USE_DB && repo && typeof (repo as any).linkVendorToRequest === "function") {
      try {
        const result = await (repo as any).linkVendorToRequest(id, vendorId, note ?? null);
        addAudit({ actor: "agent", action: "assign-vendor", requestId: id, vendorId, meta: { note, via: "db" } });
        return res.json({ ok: true, result });
      } catch (err) {
        console.error("[assign-vendor] DB failed, falling back:", err);
      }
    }

    const r = findRequestById(id);
    if (!r) return res.status(404).json({ error: "request not found" });
    r.vendorId = vendorId;
    r.activity = (r.activity ?? []).concat([
      { ts: new Date().toISOString(), kind: "assign_vendor", vendorId, note: note ?? null },
    ]);

    const job = createJobIfNeeded(id, vendorId, note ?? null);
    addAudit({ actor: "agent", action: "assign-vendor", requestId: id, vendorId, jobId: job.id, meta: { note } });

    return res.json({ ok: true, requestId: id, vendorId, job });
  } catch (e) {
    next(e);
  }
});

/* ============================= INGEST (Email/SMS) — ADDED ================== */
/** Email ingestion -> create a Request if no REQ- id is referenced */
router.post("/ingest/email", async (req, res) => {
  try {
    const { from, subject, text, property, tenantName, category, priority } = (req.body ?? {}) as any;

    const m = `${subject || ""} ${text || ""}`.match(/REQ-([A-Za-z0-9\-]+)/i);
    if (m?.[0]) {
      return res.json({ ok: true, linkedTo: m[0] });
    }

    const created = await (async () => {
      if (USE_DB && repo && typeof (repo as any).createRequest === "function") {
        try {
          const row = await (repo as any).createRequest({
            summary: subject || (text ? String(text).slice(0, 140) : "Maintenance issue reported by email"),
            category: (category as Category) ?? "Other",
            priority: (priority as Priority) ?? "Medium",
            property: property || "Unknown Unit",
            tenantName: tenantName || (from ? String(from).split("@")[0] : "Tenant"),
          });
          return row;
        } catch (err) {
          console.error("[/ingest/email] DB createRequest failed, using memory:", err);
        }
      }
      const item: RequestItem = {
        id: `REQ-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
        tenantName: tenantName || (from ? String(from).split("@")[0] : "Tenant"),
        property: property || "Unknown Unit",
        category: (category as Category) || "Other",
        priority: (priority as Priority) || "Medium",
        status: "Open",
        slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        summary: subject || (text ? String(text).slice(0, 140) : "Maintenance issue reported by email"),
      };
      REQUESTS.unshift(item);
      return item;
    })();

    addAudit({ actor: "system", action: "ingest-email", requestId: created.id, meta: { from, subject } });
    res.json({ ok: true, request: created });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "ingest failed" });
  }
});

/** SMS ingestion -> create a Request if no REQ- id is referenced */
router.post("/ingest/sms", async (req, res) => {
  try {
    const { from, text, property, tenantName, category, priority } = (req.body ?? {}) as any;

    const m = `${text || ""}`.match(/REQ-([A-Za-z0-9\-]+)/i);
    if (m?.[0]) {
      return res.json({ ok: true, linkedTo: m[0] });
    }

    const created = await (async () => {
      if (USE_DB && repo && typeof (repo as any).createRequest === "function") {
        try {
          const row = await (repo as any).createRequest({
            summary: text ? String(text).slice(0, 140) : "Maintenance issue reported by SMS",
            category: (category as Category) ?? "Other",
            priority: (priority as Priority) ?? "Medium",
            property: property || "Unknown Unit",
            tenantName: tenantName || (from || "Tenant"),
          });
          return row;
        } catch (err) {
          console.error("[/ingest/sms] DB createRequest failed, using memory:", err);
        }
      }
      const item: RequestItem = {
        id: `REQ-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
        tenantName: tenantName || (from || "Tenant"),
        property: property || "Unknown Unit",
        category: (category as Category) || "Other",
        priority: (priority as Priority) || "Medium",
        status: "Open",
        slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        summary: text ? String(text).slice(0, 140) : "Maintenance issue reported by SMS",
      };
      REQUESTS.unshift(item);
      return item;
    })();

    addAudit({ actor: "system", action: "ingest-sms", requestId: created.id, meta: { from } });
    res.json({ ok: true, request: created });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "ingest failed" });
  }
});

/* ========================== DRAFTS (DB or Agent) ========================== */
router.get("/drafts", async (_req, res) => {
  if (USE_DB && repo) {
    try {
      const data = await (repo as any).listDrafts?.();
      return res.json(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[/drafts] DB failed, using in-memory agent drafts:", err);
    }
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
});

/* =============================== AGENT CHAT ================================ */
router.post("/agent/chat", async (req, res) => {
  try {
    const { messages = [], context = {}, mode = "ask" } = (req.body ?? {}) as {
      messages?: Array<{ role: string; content: string }>;
      context?: Record<string, any>;
      mode?: "ask" | "act" | "insight";
      conversationId?: string;
    };

    const out = await pmChatRespond(
      (messages || []).map(m => ({ role: m.role as any, content: String(m.content ?? "") })),
      context,
      mode
    );

    return res.json({ ok: true, message: out.message });
  } catch (err: any) {
    console.error("[/agent/chat] error:", err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || "chat failed" });
  }
});

/* ========================== AGENT RUN ======================= */
router.post("/agent/run", async (req, res) => {
  try {
    const { requestId, mode, allowDuplicates, force } = (req.body ?? {}) as {
      requestId?: string;
      mode?: "tenant_update" | "vendor_outreach" | "both" | "source-quotes";
      allowDuplicates?: boolean;
      force?: boolean;
    };
    if (!requestId) return res.status(400).json({ error: "requestId required" });

    const reqItem = findRequestById(requestId);
    if (!reqItem) return res.status(404).json({ error: "Request not found" });

    // Special mode: Source 3 Quotes (DB-first)
    if (mode === "source-quotes") {
      if (force) {
        for (let i = PROSPECTS.length - 1; i >= 0; i--) {
          if (PROSPECTS[i].requestId === requestId) PROSPECTS.splice(i, 1);
        }
      }

      let vendors: Array<{ id: string; name: string; trade?: string; category?: string; email?: string | null; phone?: string | null }> = [];
      if (USE_DB && repo && typeof (repo as any).listVendors === "function") {
        try {
          const rows = await (repo as any).listVendors();
          vendors = rows.map((v: any) => ({ id: v.id, name: v.name, trade: v.trade ?? v.category, email: v.email ?? null, phone: v.phone ?? null }));
        } catch (err) {
          console.error("[source-quotes] DB listVendors failed, using mocks:", err);
          vendors = VENDORS.map((v) => ({ id: v.id, name: v.name, trade: v.trade as string, email: undefined, phone: undefined }));
        }
      } else {
        vendors = VENDORS.map((v) => ({ id: v.id, name: v.name, trade: v.trade as string, email: undefined, phone: undefined }));
      }

      const result = await sourceQuotes({
        requestId,
        request: {
          summary: reqItem.summary,
          category: reqItem.category,
          priority: reqItem.priority,
          property: reqItem.property,
        },
        vendors,
      });

      const existing = new Set(PROSPECTS.filter(p => p.requestId === requestId).map(p => p.vendorId));
      let picks = result.picks.filter(p => !existing.has(p.vendorId)).slice(0, 3);
      if (picks.length < 3 && allowDuplicates) {
        const need = 3 - picks.length;
        const extras = result.picks.filter(p => !picks.includes(p)).slice(0, need);
        picks = picks.concat(extras);
      }

      // Create prospects — DB first
      let createdProspects: Prospect[] = [];
      if (USE_DB && repo && typeof (repo as any).createProspects === "function") {
        try {
          const bulk = picks.map(p => ({ requestId, vendorId: p.vendorId, note: p.note ?? null }));
          const out = await (repo as any).createProspects(bulk);
          const vById = new Map(vendors.map(v => [v.id, v]));
          createdProspects = (out?.rows || out || []).map((pr: any) => ({
            id: pr.id,
            requestId: pr.requestId,
            vendorId: pr.vendorId,
            vendorName: vById.get(pr.vendorId)?.name || "Vendor",
            trade: vById.get(pr.vendorId)?.trade ?? vById.get(pr.vendorId)?.category ?? "general",
            email: vById.get(pr.vendorId)?.email ?? null,
            phone: vById.get(pr.vendorId)?.phone ?? null,
            status: pr.status || "pending",
            createdAt: pr.createdAt || new Date().toISOString(),
            note: pr.note ?? null,
            estimatedCost: pr.estimatedCost ?? null,
          }));
        } catch (err) {
          console.error("[source-quotes] DB createProspects failed, using in-memory:", err);
        }
      }

      // Fallback to in-memory
      if (!createdProspects.length) {
        createdProspects = picks.map(p => {
          const v = vendors.find(vv => vv.id === p.vendorId);
          const pr: Prospect = {
            id: `PR-${Math.random().toString(36).slice(2, 9)}`,
            requestId,
            vendorId: p.vendorId,
            vendorName: v?.name || "Vendor",
            trade: v?.trade ?? v?.category ?? "general",
            email: v?.email ?? null,
            phone: v?.phone ?? null,
            status: "pending",
            createdAt: new Date().toISOString(),
            note: p.note ?? null,
            estimatedCost: null,
          };
          PROSPECTS.push(pr);
          return pr;
        });
      }

      // Build email drafts for each prospect
      const TEST_EMAIL =
        process.env.POSTMARK_TEST_TO ||
        process.env.POSTMARK_FROM ||
        "operations@parcolabs.com";

      const subject = `Quote request: ${reqItem.category} - ${reqItem.property}`;
      const bodyFor = (vendorName: string) => `Hi ${vendorName},

We have a new job: “${reqItem.summary}” at ${reqItem.property}.
Priority: ${reqItem.priority}. Could you provide a quote and earliest availability?

Please reply with:
• Call-out fee (if any)
• Ballpark estimate or T&M rate
• Earliest visit window

Thanks,
Parco PM`;

      const draftsInput: AgentDraft[] = createdProspects.map((pr) => {
        const email = pr.email || TEST_EMAIL;
        return {
          id: "",
          requestId,
          kind: "vendor_outreach",
          channel: "email",
          to: email,
          subject,
          body: bodyFor(pr.vendorName),
          status: "draft",
          createdAt: new Date().toISOString(),
        } as any;
      });

      if (draftsInput.length > 0) {
        if (USE_DB && repo && typeof (repo as any).insertAgentDrafts === "function") {
          try {
            await (repo as any).insertAgentDrafts(requestId, draftsInput as any);
          } catch (err) {
            console.error("[source-quotes] DB insert drafts failed, using in-memory:", err);
            addAgentDrafts(requestId, draftsInput);
          }
        } else {
          addAgentDrafts(requestId, draftsInput);
        }
      }

      addAudit({ actor: "agent", action: "source-3-quotes", requestId });

      return res.json({
        ok: true,
        mode,
        created: createdProspects.length,
        prospects: createdProspects,
        draftsCreated: draftsInput.length,
        rationale: result.rationale,
      });
    }

    // Default agent run (non-source-quotes)
    const isUsingOpenAI = process.env.USE_REAL_OPENAI === "true";
    console.log(`[API] Running agent for request ${requestId} using ${isUsingOpenAI ? "OpenAI" : "Mock LLM"}`);

    const result = await runAgentForRequest(requestId, {
      subject: reqItem.summary,
      body: `Category: ${reqItem.category}, Priority: ${reqItem.priority}, Property: ${reqItem.property}, Status: ${reqItem.status}`,
    });

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
      try {
        const result = await (repo as any).approveAndSendDraft?.(id);
        return res.json(result);
      } catch (err) {
        console.error("[approve-draft] DB path failed, falling back:", err);
      }
    }
    const draft = getAgentDraftById(id);
    if (!draft) return res.status(404).json({ error: "draft not found" });

    if (draft.channel === "email") {
      const subject = draft.subject || "Message from Parco PM";
      const result = await sendEmail(draft.to, subject, draft.body);
      if ((result as any).skipped) console.warn("[approve] Email skipped (missing Postmark config)");
    } else if (draft.channel === "sms") {
      const result = await sendSMS(draft.to, draft.body);
      if ((result as any).skipped) console.warn("[approve] SMS skipped (missing Twilio config or disabled)");
    }

    const ok = markAgentDraftSent(id);
    if (!ok) return res.status(404).json({ error: "draft not found after send" });
    res.json({ ok: true, sent: true });
  } catch (e) {
    next(e);
  }
});

/* ============================== JOB ROUTES (mock/DB) ====================== */
router.get("/jobs", (req, res) => {
  const { vendorId, requestId } = req.query as { vendorId?: string; requestId?: string };
  let rows = [...JOBS];
  if (vendorId) rows = rows.filter((j) => j.vendorId === vendorId);
  if (requestId) rows = rows.filter((j) => j.requestId === requestId);
  res.json(rows);
});

router.post("/jobs/:id/progress", async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const { note } = (req.body ?? {}) as { note?: string };

    if (USE_DB && repo && typeof (repo as any).jobProgress === "function") {
      try {
        const out = await (repo as any).jobProgress(id, note);
        addAudit({
          actor: "agent",
          action: "job-progress",
          jobId: out.id,
          requestId: out.requestId,
          vendorId: out.vendorId,
          meta: { note },
        });
        return res.json({ ok: true, job: out });
      } catch (err) {
        console.error("[job-progress] DB path failed, falling back:", err);
      }
    }

    const job = JOBS.find((j) => j.id === id);
    if (!job) return res.status(404).json({ error: "job not found" });
    if (job.status === "completed") return res.status(400).json({ error: "job already completed" });

    job.status = "in_progress";
    job.startedAt = job.startedAt ?? new Date().toISOString();
    job.notes = (job.notes ?? []).concat(note ? [note] : []);

    addAudit({
      actor: "agent",
      action: "job-progress",
      jobId: job.id,
      requestId: job.requestId,
      vendorId: job.vendorId,
      meta: { note },
    });

    res.json({ ok: true, job });
  } catch (e) { next(e); }
});

router.post("/jobs/:id/proof", async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const { url, note } = (req.body ?? {}) as { url?: string; note?: string };

    if (USE_DB && repo && typeof (repo as any).jobAddProof === "function") {
      try {
        const out = await (repo as any).jobAddProof(id, { url, note });
        addAudit({ actor: "agent", action: "job-proof", jobId: out.id, requestId: out.requestId, vendorId: out.vendorId, meta: { url, note } });
        return res.json({ ok: true, job: out });
      } catch (err) {
        console.error("[job-proof] DB path failed, falling back:", err);
      }
    }

    const job = JOBS.find((j) => j.id === id);
    if (!job) return res.status(404).json({ error: "job not found" });

    job.proof = { url: url || null, note: note || null, addedAt: new Date().toISOString() };
    addAudit({ actor: "agent", action: "job-proof", jobId: job.id, requestId: job.requestId, vendorId: job.vendorId, meta: { url, note } });

    res.json({ ok: true, job });
  } catch (e) { next(e); }
});

router.post("/jobs/:id/complete", async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const { note, force, reason } = (req.body ?? {}) as { note?: string; force?: boolean; reason?: string };

    if (USE_DB && repo && typeof (repo as any).jobComplete === "function") {
      try {
        const out = await (repo as any).jobComplete(id, { note, force, reason });
        addAudit({
          actor: "agent",
          action: "job-complete",
          jobId: out.id,
          requestId: out.requestId,
          vendorId: out.vendorId,
          meta: { note, forced: !!force, reason: reason || null },
        });
        return res.json({ ok: true, job: out });
      } catch (err: any) {
        if (err?.status === 412) {
          return res.status(412).json(err.data || { ok: false, policy: "proof_required" });
        }
        console.error("[job-complete] DB path failed, falling back:", err);
      }
    }

    const job = JOBS.find((j) => j.id === id);
    if (!job) return res.status(404).json({ error: "job not found" });

    if (!force && !job.proof) {
      return res.status(412).json({ ok: false, policy: "proof_required" });
    }

    job.status = "completed";
    job.completedAt = new Date().toISOString();
    job.notes = (job.notes ?? []).concat(note ? [note] : []);
    addAudit({
      actor: "agent",
      action: "job-complete",
      jobId: job.id,
      requestId: job.requestId,
      vendorId: job.vendorId,
      meta: { note, forced: !!force, reason: reason || null },
    });

    res.json({ ok: true, job });
  } catch (e) { next(e); }
});

/* ============================== SETTINGS (DB or Mock) ===================== */
import {
  getSettings as memGetSettings,
  updateProperty as memUpdateProperty,
  updateChannels as memUpdateChannels,
  updateSla as memUpdateSla,
  updateRent as memUpdateRent,
  addVendor as memAddVendor,
  importTenants as memImportTenants,
} from "./storage.js";

router.get("/settings", async (_req, res) => {
  if (USE_DB && repo && typeof (repo as any).getSettingsFromDb === "function") {
    try {
      const out = await (repo as any).getSettingsFromDb();
      return res.json(out);
    } catch (err) {
      console.error("[/settings] DB failed, using memory:", err);
    }
  }
  return res.json(memGetSettings());
});

router.patch("/settings", async (req, res) => {
  const body = (req.body ?? {}) as {
    profile?: any; property?: any; channels?: any; sla?: any; rent?: any;
  };

  if (USE_DB && repo && typeof (repo as any).updateSettingsInDb === "function") {
    try {
      const out = await (repo as any).updateSettingsInDb(body);
      return res.json(out);
    } catch (err) {
      console.error("[PATCH /settings] DB failed, using memory:", err);
    }
  }

  if (body.property) memUpdateProperty(body.property);
  if (body.channels) memUpdateChannels(body.channels);
  if (body.sla) memUpdateSla(body.sla);
  if (body.rent) memUpdateRent(body.rent);

  return res.json(memGetSettings());
});

// Add vendor
router.post("/settings/vendors", async (req, res) => {
  try {
    const payload = (req.body ?? {}) as {
      name: string; email?: string | null; phone?: string | null; type?: string | null; serviceArea?: string | null;
    };
    if (!payload.name) return res.status(400).json({ error: "name required" });

    if (USE_DB && repo && typeof (repo as any).addVendorFromSettings === "function") {
      try {
        const out = await (repo as any).addVendorFromSettings(payload);
        return res.json({ ok: true, vendor: out });
      } catch (err) {
        console.error("[POST /settings/vendors] DB failed, using memory:", err);
      }
    }

    const v = memAddVendor(payload as any);
    return res.json({ ok: true, vendor: v });
  } catch { return res.status(500).json({ error: "failed to add vendor" }); }
});

// Import tenants CSV
router.post("/settings/tenants/import", async (req, res) => {
  try {
    const rows = (req.body ?? {}).rows as Array<any> | undefined;
    if (!Array.isArray(rows)) return res.status(400).json({ error: "rows array required" });
    const info = memImportTenants(rows as any);
    res.json({ ok: true, ...info });
  } catch { res.status(500).json({ error: "import failed" }); }
});

/* ---------------------------- Vendors & Properties ------------------------- */
router.get("/vendors", async (_req, res) => {
  if (USE_DB && repo) {
    try {
      const rows = await (repo as any).listVendors?.();
      return res.json(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("[/vendors] DB failed, using mocks:", err);
    }
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
});

/* ------------------------------- PROPERTIES -------------------------------- */
router.get("/properties", async (_req, res) => {
  if (USE_DB && repo && typeof (repo as any).listProperties === "function") {
    try {
      const rows = await (repo as any).listProperties();
      return res.json((rows || []).map((p: any) => ({ id: p.id, name: p.name, address: p.address ?? undefined })));
    } catch (err) {
      console.error("[/properties] DB failed, using memory:", err);
    }
  }
  return res.json(PROPERTIES_STORE);
});

router.post("/properties", async (req, res) => {
  const { 
    name, 
    address, 
    city, 
    state, 
    type, 
    unitsTotal, 
    yearBuilt, 
    owner, 
    avgRent, 
    propertyClass 
  } = (req.body ?? {}) as { 
    name?: string; 
    address?: string | null;
    city?: string;
    state?: string;
    type?: string;
    unitsTotal?: number;
    yearBuilt?: number;
    owner?: string;
    avgRent?: number;
    propertyClass?: string;
  };
  
  if (!name) return res.status(400).json({ error: "name required" });

  if (USE_DB && repo && typeof (repo as any).createProperty === "function") {
    try {
      const row = await (repo as any).createProperty({ name, address: address ?? null });
      return res.json({ ok: true, property: row });
    } catch (err) {
      console.error("[POST /properties] DB failed, using memory:", err);
    }
  }

  const pid = slug(name);
  const exists = PROPERTIES_STORE.find((p) => p.id === pid);
  
  const newProp: PropertyRow = {
    id: exists ? `${pid}-${Math.random().toString(36).slice(2, 6)}` : pid,
    name,
    address: address ?? (city && state ? `${city}, ${state}` : null),
    city: city ?? null,
    state: state ?? null,
    type: type ?? "Multifamily",
    status: "Active",
    units: unitsTotal ?? 0,
    unitsTotal: unitsTotal ?? 0,
    occ: 0,
    occupancyPct: 0,
    noiTtm: 0,
    ttmNOI: 0,
    yearBuilt: yearBuilt ?? null,
    owner: owner ?? null,
    avgRent: avgRent ?? null,
    propertyClass: propertyClass ?? "B",
  };
  
  PROPERTIES_STORE.push(newProp);
  console.log("[POST /properties] Created property:", newProp.id, newProp.name);
  return res.json({ ok: true, property: newProp });
});

router.put("/properties/:id", async (req, res) => {
  const { id } = req.params as { id: string };
  const { name, address } = (req.body ?? {}) as { name?: string | null; address?: string | null };

  if (USE_DB && repo && typeof (repo as any).updatePropertyRow === "function") {
    try {
      const row = await (repo as any).updatePropertyRow(id, { name, address });
      return res.json({ ok: true, property: row });
    } catch (err) {
      console.error("[PUT /properties/:id] DB failed, using memory:", err);
    }
  }

  const i = PROPERTIES_STORE.findIndex((p) => p.id === id);
  if (i === -1) return res.status(404).json({ error: "property not found" });
  PROPERTIES_STORE[i] = {
    ...PROPERTIES_STORE[i],
    ...(name != null ? { name } : {}),
    ...(address !== undefined ? { address } : {}),
  };
  return res.json({ ok: true, property: PROPERTIES_STORE[i] });
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

  addAudit({ actor: "system", action: "job-complete", jobId: job.id, requestId: job.requestId, vendorId: job.vendorId, meta: { via: "email_webhook" } });

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

  addAudit({ actor: "system", action: "job-complete", jobId: job.id, requestId: job.requestId, vendorId: job.vendorId, meta: { via: "sms_webhook" } });

  res.json({ ok: true, job });
});

/* ------------------------------- Vendor Jobs ------------------------------- */
router.get("/vendor-jobs", async (_req, res) => {
  if (USE_DB && repo && typeof (repo as any).listVendorJobs === "function") {
    try {
      const rows = await (repo as any).listVendorJobs();
      return res.json(rows || []);
    } catch (err) {
      console.error("[/vendor-jobs] DB failed, using memory:", err);
    }
  }

  const vendorById = new Map(VENDORS.map((v) => [v.id, v]));
  const rows = JOBS.map((j) => {
    const r = findRequestById(j.requestId);
    const v = vendorById.get(j.vendorId);
    return {
      id: j.id,
      requestId: j.requestId,
      vendorId: j.vendorId,
      vendorName: v?.name || "Vendor",
      title: r?.summary || r?.category || "Request",
      category: r?.category,
      priority: r?.priority,
      status: j.status,
      property: r?.property,
      createdAt: j.createdAt,
      lastActivityAt: j.completedAt ?? j.startedAt ?? j.createdAt,
      note: (j.notes && j.notes.length > 0 ? j.notes[j.notes.length - 1] : null) as string | null,
      visit: j.visit ?? null,
      proof: j.proof ?? null,
    };
  });
  res.json(rows);
});

/* ----------------------------- Vendor Prospects ---------------------------- */
router.get("/vendor-prospects", async (_req, res) => {
  if (USE_DB && repo && typeof (repo as any).listProspects === "function") {
    try {
      const rows = await (repo as any).listProspects();
      return res.json(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("[/vendor-prospects] DB failed, using memory:", err);
    }
  }
  try { res.json(Array.isArray(PROSPECTS) ? PROSPECTS : []); } catch { res.json([]); }
});

/* Guardrails v2 — budget caps by property (demo) */
const BUDGET_CAP_BY_PROPERTY: Record<string, number> = {
  "Unit 3B": 500,
  "Unit 2A": 350,
};

// Approve prospect — DB-first with 412 guardrail; fallback to in-memory
router.post("/vendor-prospects/:id/approve", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as any;
    const estimatedCost: number | undefined =
      typeof body.estimatedCost === "number"
        ? body.estimatedCost
        : typeof body.estimate === "number"
        ? body.estimate
        : undefined;
    const force: boolean = !!(body.force || body.override === true);
    const reason: string | undefined = body.reason ?? body.overrideReason;

    if (USE_DB && repo && typeof (repo as any).approveProspect === "function") {
      try {
        const out = await (repo as any).approveProspect(id, {
          estimatedCost: estimatedCost ?? null,
          note: body.note ?? null,
          force,
          reason,
          notifyVendor: false,
        });
        addAudit({
          actor: "agent",
          action: "approve-vendor",
          requestId: out.requestId,
          vendorId: out.vendorId,
          meta: { estimatedCost: out.estimatedCost ?? null, forced: !!force, reason: reason || null },
        });
        return res.json({ ok: true, prospect: out });
      } catch (err: any) {
        if (err?.status === 412) {
          return res.status(412).json(err.data || { ok: false, policy: "budget_cap" });
        }
        console.error("[approve-prospect] DB path failed, falling back:", err);
      }
    }

    const pr = PROSPECTS.find(p => p.id === id);
    if (!pr) return res.status(404).json({ error: "prospect not found" });

    const reqItem = findRequestById(pr.requestId);
    const cap = BUDGET_CAP_BY_PROPERTY[reqItem.property] ?? 500;
    if (typeof estimatedCost === "number") pr.estimatedCost = estimatedCost;

    if (!force && typeof estimatedCost === "number" && estimatedCost > cap) {
      return res.status(412).json({ ok: false, policy: "budget_cap", cap, estimatedCost });
    }

    if (pr.status !== "approved") {
      pr.status = "approved";
      const job = createJobIfNeeded(pr.requestId, pr.vendorId, pr.note ?? undefined);
      addAudit({
        actor: "agent",
        action: "approve-vendor",
        requestId: pr.requestId,
        vendorId: pr.vendorId,
        jobId: job.id,
        meta: { estimatedCost: pr.estimatedCost ?? null, forced: !!force, reason: reason || null, cap },
      });
      return res.json({ ok: true, prospect: pr, job });
    }

    return res.json({ ok: true, prospect: pr });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "approve failed" });
  }
});

/* ================================ DEMO RESET =============================== */
router.post("/admin/reset", async (_req, res) => {
  if (USE_DB && repo && typeof (repo as any).adminResetDemoData === "function") {
    try { await (repo as any).adminResetDemoData(); }
    catch (e) { console.warn("[admin reset] DB reset failed; continuing with in-memory seed"); }
  }

  JOBS.length = 0;
  PROSPECTS.length = 0;
  resetAgentStorage();
  resetAuditLog();

  REQUESTS.length = 0;
  for (const r of seedRequests()) REQUESTS.push(r);

  PROPERTIES_STORE.length = 0;
  for (const p of seedProperties()) PROPERTIES_STORE.push(p);

  addAudit({ actor: "system", action: "admin-reset" });

  console.log("[admin] Demo data reset.");
  res.json({
    ok: true,
    requests: REQUESTS.length,
    jobs: JOBS.length,
    properties: PROPERTIES_STORE.length,
  });
});

/* =========================== AGENT EXECUTE (enhanced) ===================== */
import { publishTenantNotice } from "./actions/publishTenantNotice.js";

type AgentRunStepStatus = "queued" | "running" | "done" | "failed";
interface AgentRunStep {
  id: string;
  action: string;
  args: Record<string, any>;
  status: AgentRunStepStatus;
  result?: string;
  error?: string;
}
interface AgentRunState {
  runId: string;
  status: "running" | "paused" | "completed" | "failed" | "stopped";
  steps: AgentRunStep[];
  currentUrl: string;
  lastScreenshot: string;
  logs: string[];
  sessionId: string | null;
  createdAt: number;
}

const agentRuns = new Map<string, AgentRunState>();

function genRunId(): string {
  return "run-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
}
function genStepId(): string {
  return "step-" + Math.random().toString(36).slice(2, 8);
}

function normalizeUrl(input: string): { url: string; error?: string } {
  if (!input || typeof input !== "string") {
    return { url: "", error: "URL is required" };
  }
  let url = input.trim();
  if (url.startsWith("file://") || url.startsWith("javascript:") || url.startsWith("data:")) {
    return { url: "", error: "Only http and https URLs are supported" };
  }
  if (!url.match(/^https?:\/\//i)) {
    if (url.startsWith("www.")) {
      url = "https://" + url;
    } else if (url.includes(".") && !url.includes(" ")) {
      url = "https://" + url;
    } else {
      return { url: "", error: `Invalid URL format: "${input}". Please provide a valid web address.` };
    }
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { url: "", error: "Only http and https URLs are supported" };
    }
    return { url: parsed.href };
  } catch {
    return { url: "", error: `Could not parse URL: "${input}"` };
  }
}

function parseMessageToRunSteps(message: string): AgentRunStep[] {
  const steps: AgentRunStep[] = [];
  const lower = message.toLowerCase();

  const gotoPatterns = [
    /(?:go to|navigate to|open|visit|browse to)\s+(?:the\s+)?(?:website\s+)?["']?([^\s"']+)["']?/i,
    /(?:go to|navigate to|open|visit|browse to)\s+(.+?)(?:\s+and|\s+then|$)/i,
  ];
  for (const pattern of gotoPatterns) {
    const match = message.match(pattern);
    if (match) {
      const rawUrl = match[1].trim().replace(/[.,!?]+$/, "");
      const { url, error } = normalizeUrl(rawUrl);
      if (url) {
        steps.push({ id: genStepId(), action: "goto", args: { url }, status: "queued" });
      } else if (error) {
        steps.push({ id: genStepId(), action: "error", args: { message: error }, status: "failed", error });
      }
      break;
    }
  }

  const clickPatterns = [
    /click\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']/i,
    /click\s+(?:on\s+)?(?:the\s+)?(\S+)\s+(?:button|link|element)/i,
  ];
  for (const pattern of clickPatterns) {
    const match = message.match(pattern);
    if (match) {
      steps.push({ id: genStepId(), action: "click", args: { selector: `text=${match[1].trim()}` }, status: "queued" });
      break;
    }
  }

  if (lower.includes("screenshot") || lower.includes("capture")) {
    steps.push({ id: genStepId(), action: "screenshot", args: {}, status: "queued" });
  }

  if (steps.length === 0 && lower.match(/zillow|redfin|realtor|trulia|apartments/i)) {
    const siteMatch = lower.match(/(zillow|redfin|realtor|trulia|apartments)/i);
    if (siteMatch) {
      const site = siteMatch[1].toLowerCase();
      const domain = site === "apartments" ? "apartments.com" : `${site}.com`;
      steps.push({ id: genStepId(), action: "goto", args: { url: `https://www.${domain}` }, status: "queued" });
    }
  }

  if (steps.length === 0) {
    steps.push({ id: genStepId(), action: "info", args: { message: `Could not parse: "${message}". Try "go to zillow.com"` }, status: "done" });
  }
  return steps;
}

async function executeAgentRun(runId: string, _baseUrl: string) {
  const run = agentRuns.get(runId);
  if (!run) return;
  run.logs.push(`[${new Date().toLocaleTimeString()}] Starting run...`);
  const internalBase = `http://localhost:${process.env.PORT || 5000}`;
  try {
    const openRes = await fetch(`${internalBase}/api/agent/web/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "" }),
    });
    console.log(`[executeAgentRun] Response status: ${openRes.status}, content-type: ${openRes.headers.get("content-type")}`);
    const openText = await openRes.text();
    console.log(`[executeAgentRun] Response text (first 200 chars): ${openText.substring(0, 200)}`);
    let openData: any;
    try {
      openData = JSON.parse(openText);
    } catch {
      run.status = "failed";
      run.logs.push(`[${new Date().toLocaleTimeString()}] Invalid response from web/open (not JSON)`);
      console.log(`[executeAgentRun] JSON parse failed - response was HTML`);
      return;
    }
    if (!openData.ok) {
      run.status = "failed";
      run.logs.push(`[${new Date().toLocaleTimeString()}] Failed to start browser: ${openData.error}`);
      return;
    }
    run.sessionId = openData.sessionId;
    run.lastScreenshot = openData.screenshotUrl;
    run.currentUrl = openData.currentUrl || "about:blank";
    run.logs.push(`[${new Date().toLocaleTimeString()}] Browser started`);

    for (const step of run.steps) {
      if (run.status === "stopped" || run.status === "failed") break;
      while (run.status === "paused") {
        await new Promise(r => setTimeout(r, 500));
        if ((run as AgentRunState).status === "stopped") break;
      }
      if ((run as AgentRunState).status === "stopped") break;

      step.status = "running";
      run.logs.push(`[${new Date().toLocaleTimeString()}] Executing: ${step.action}`);

      if (step.action === "error" || step.action === "info") {
        step.status = step.action === "error" ? "failed" : "done";
        step.result = step.args.message;
        continue;
      }

      try {
        const stepRes = await fetch(`${internalBase}/api/agent/web/step`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: run.sessionId, action: step.action, args: step.args }),
        });
        const stepText = await stepRes.text();
        let stepData: any;
        try {
          stepData = JSON.parse(stepText);
        } catch {
          step.status = "failed";
          step.error = "Invalid response (not JSON)";
          run.logs.push(`[${new Date().toLocaleTimeString()}] Step failed: invalid response format`);
          continue;
        }
        if (!stepData.ok) {
          step.status = "failed";
          step.error = stepData.error;
          run.logs.push(`[${new Date().toLocaleTimeString()}] Step failed: ${stepData.error}`);
        } else {
          step.status = "done";
          step.result = "Completed";
          run.lastScreenshot = stepData.screenshotUrl;
          run.currentUrl = stepData.currentUrl || run.currentUrl;
          run.logs.push(`[${new Date().toLocaleTimeString()}] Step done - ${run.currentUrl}`);
        }
      } catch (err: any) {
        step.status = "failed";
        step.error = err?.message || "Unknown error";
        run.logs.push(`[${new Date().toLocaleTimeString()}] Step error: ${err?.message}`);
      }
      await new Promise(r => setTimeout(r, 300));
    }
    if (run.status === "running") {
      run.status = "completed";
      run.logs.push(`[${new Date().toLocaleTimeString()}] Run completed`);
    }
  } catch (err: any) {
    run.status = "failed";
    run.logs.push(`[${new Date().toLocaleTimeString()}] Run failed: ${err?.message}`);
  }
}

router.post("/agent/execute", async (req, res) => {
  try {
    const body = req.body ?? {};

    // NEW: message-based format for Agent Mode
    if (body.message && typeof body.message === "string") {
      console.log("[agent/execute] Message mode:", body.message);
      const steps = parseMessageToRunSteps(body.message);
      const runId = genRunId();
      const run: AgentRunState = {
        runId, status: "running", steps,
        currentUrl: "", lastScreenshot: "",
        logs: [`[${new Date().toLocaleTimeString()}] Parsed ${steps.length} step(s)`],
        sessionId: null, createdAt: Date.now(),
      };
      agentRuns.set(runId, run);
      const protocol = req.protocol;
      const host = req.get("host");
      executeAgentRun(runId, `${protocol}://${host}`);
      return res.json({ ok: true, runId, steps: steps.map(s => ({ id: s.id, action: s.action, status: s.status })) });
    }

    // Legacy: action/steps format
    const results: any[] = [];
    if (body.action) {
      const action = body.action as string;
      const input = body.payload ?? {};
      const out = await handleAgentAction(action, input);
      results.push({ action, ...out });
      return res.json({ ok: true, results });
    }
    const steps = Array.isArray(body.steps) ? body.steps : [];
    for (const step of steps) {
      const action = step.action as string;
      const input = step.input ?? {};
      const out = await handleAgentAction(action, input);
      results.push({ action, ...out });
    }
    res.json({ ok: true, results });
  } catch (err: any) {
    console.error("[agent/execute] error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/agent/runs/:runId", (req, res) => {
  const { runId } = req.params;
  const run = agentRuns.get(runId);
  if (!run) {
    return res.status(404).json({ ok: false, error: "Run not found" });
  }
  res.json({
    ok: true,
    run: {
      runId: run.runId, status: run.status, steps: run.steps,
      currentUrl: run.currentUrl, lastScreenshot: run.lastScreenshot,
      logs: run.logs.slice(-50),
    },
  });
});

router.post("/agent/runs/:runId/pause", (req, res) => {
  const run = agentRuns.get(req.params.runId);
  if (!run) return res.status(404).json({ ok: false, error: "Run not found" });
  if (run.status === "running") {
    run.status = "paused";
    run.logs.push(`[${new Date().toLocaleTimeString()}] Paused`);
  }
  res.json({ ok: true, status: run.status });
});

router.post("/agent/runs/:runId/resume", (req, res) => {
  const run = agentRuns.get(req.params.runId);
  if (!run) return res.status(404).json({ ok: false, error: "Run not found" });
  if (run.status === "paused") {
    run.status = "running";
    run.logs.push(`[${new Date().toLocaleTimeString()}] Resumed`);
  }
  res.json({ ok: true, status: run.status });
});

router.post("/agent/runs/:runId/stop", async (req, res) => {
  const run = agentRuns.get(req.params.runId);
  if (!run) return res.status(404).json({ ok: false, error: "Run not found" });
  run.status = "stopped";
  run.logs.push(`[${new Date().toLocaleTimeString()}] Stopped`);
  if (run.sessionId) {
    try {
      await fetch(`http://localhost:${process.env.PORT || 5000}/api/agent/web/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: run.sessionId }),
      });
    } catch {}
  }
  res.json({ ok: true, status: run.status });
});

/* ===== Property Listing Assistant (helpers embedded to avoid new files) ==== */
type CreateListingInput = {
  propertyId?: string;
  propertyName?: string;
  address?: string | null;
  units?: number | null;
  occ?: number | null;
  noiTtm?: number | null;
  beds?: number | null;
  baths?: number | null;
  sqft?: number | null;
  notes?: string | null;
};
function computeListingSuggestion(input: CreateListingInput) {
  const {
    propertyId, propertyName, address, units, occ, noiTtm, beds, baths, sqft, notes,
  } = input || {};

  const addr = (address || "").toLowerCase();
  const locFactor =
    addr.includes("new york") || addr.includes("brooklyn") || addr.includes("queens")
      ? 1.25
      : addr.includes("san francisco")
      ? 1.35
      : addr.includes("miami")
      ? 1.15
      : addr.includes("austin")
      ? 1.05
      : 1.0;

  const occPct = typeof occ === "number" && occ > 0 ? occ : 92;
  const noi = typeof noiTtm === "number" && noiTtm > 0 ? noiTtm : 250_000;
  const unitCount = typeof units === "number" && units > 0 ? units : 10;

  const base = (noi / Math.max(1, unitCount)) / 12;
  const occScale = 0.9 + Math.min(1.1, Math.max(0.8, occPct / 100));
  const raw = base * occScale * locFactor;

  const bedAdj = beds ? 1 + Math.min(0.4, 0.15 * Math.max(0, beds - 1)) : 1;
  const bathAdj = baths ? 1 + Math.min(0.25, 0.1 * Math.max(0, baths - 1)) : 1;
  const sqftAdj = sqft ? Math.min(1.5, Math.max(0.7, sqft / 700)) : 1;

  const priceSuggested = Math.round((raw * bedAdj * bathAdj * sqftAdj) / 25) * 25;

  const headline = `${beds ?? 1}BR${baths ? `/${baths}BA` : ""} in ${propertyName || "Great Building"}`;
  const features = [
    "Sunlit rooms",
    "Modern finishes",
    "On-site laundry",
    "Responsive management",
    "Near transit & shops",
  ];
  const descParts = [
    `Welcome to ${propertyName || "our property"}${address ? ` at ${address}` : ""}.`,
    `This ${beds ?? 1} bedroom${beds && beds > 1 ? "s" : ""}${baths ? ` / ${baths} bath` : ""}${sqft ? ` • ${sqft} sqft` : ""} home features ${features.slice(0,3).join(", ").toLowerCase()}.`,
    `Professionally managed by Parco — quick maintenance, easy payments, and a great resident experience.`,
    notes ? `Notes: ${notes}` : "",
  ].filter(Boolean);

  const ad =
`**${headline}** — $${priceSuggested.toLocaleString()}/mo

${descParts.join("\n\n")}

**Highlights**
- ${features.join("\n- ")}

**Next steps**
- Reply here to schedule a tour
- Apply online with Parco`;

  return {
    ok: true as const,
    result: {
      propertyId: propertyId || null,
      propertyName: propertyName || null,
      address: address || null,
      ad,
      priceSuggested,
      meta: {
        units: unitCount,
        occ: occPct,
        noiTtm: noi,
        beds: beds ?? null,
        baths: baths ?? null,
        sqft: sqft ?? null,
        locFactor,
      },
      createdAt: new Date().toISOString(),
    },
  };
}
function mockPublishListing(input: { propertyId?: string; ad?: string; price?: number; sites?: string[] }) {
  const sites = Array.isArray(input?.sites) && input!.sites!.length
    ? input!.sites!
    : ["streeteasy", "rent.com"];
  return {
    ok: true as const,
    postedTo: sites.map((s) => ({
      site: s,
      status: "queued",
      ref: `mock-${s}-${Math.random().toString(36).slice(2, 8)}`,
    })),
    at: new Date().toISOString(),
  };
}

/* ---------------------------- Agent actions switch ------------------------- */
async function handleAgentAction(action: string, input: any) {
  switch (action) {
    case "publish-tenant-notice": {
      const result = await publishTenantNotice(input);
      addAudit({
        actor: "agent",
        action: "publish-tenant-notice",
        requestId: input?.requestId,
        meta: { channel: input?.channel ?? "email", subject: input?.subject ?? null },
      });
      return { result };
    }
    case "schedule-visit": {
      const { jobId, when, window, note } = input || {};
      if (!jobId || !when) return { error: "jobId and when are required" };
      const job = JOBS.find((j) => j.id === jobId);
      if (!job) return { error: "job not found" };
      job.visit = { when, window, note };
      addAudit({
        actor: "agent",
        action: "schedule-visit",
        jobId: job.id,
        requestId: job.requestId,
        vendorId: job.vendorId,
        meta: { when, window, note },
      });
      return { ok: true, job };
    }
    case "send-visit-confirmations": {
      const {
        jobId,
        when,
        window,
        note,
        tenantEmail,
        tenantPhone,
        vendorEmail,
        vendorPhone,
        channels = [],
      } = input || {};
      const job = jobId ? JOBS.find((j) => j.id === jobId) : null;

      const sent: string[] = [];
      const errors: Array<{ channel: string; error: string }> = [];

      const whenText = (() => {
        try { return new Date(when).toLocaleString(); } catch { return String(when || ""); }
      })();
      const windowText = window ? ` (${window})` : "";
      const noteText = note ? `\nNote: ${note}` : "";

      const tenantMsg = `Your service visit is scheduled for ${whenText}${windowText}.${noteText}\n\n— Parco PM`;
      const vendorMsg = `A visit has been scheduled for ${whenText}${windowText}.${noteText}\n\n— Parco PM`;

      if (channels.includes("tenant_email") && tenantEmail) {
        try {
          await sendEmail(tenantEmail, "Visit Confirmation", tenantMsg);
          sent.push("tenant_email");
          addAudit({ actor: "agent", action: "visit-confirmation", requestId: job?.requestId, jobId: job?.id, vendorId: job?.vendorId, meta: { channel: "tenant_email", to: tenantEmail } });
        } catch (e: any) {
          errors.push({ channel: "tenant_email", error: e?.message || "email failed" });
        }
      }
      if (channels.includes("vendor_email") && vendorEmail) {
        try {
          await sendEmail(vendorEmail, "Visit Scheduled", vendorMsg);
          sent.push("vendor_email");
          addAudit({ actor: "agent", action: "visit-confirmation", requestId: job?.requestId, jobId: job?.id, vendorId: job?.vendorId, meta: { channel: "vendor_email", to: vendorEmail } });
        } catch (e: any) {
          errors.push({ channel: "vendor_email", error: e?.message || "email failed" });
        }
      }
      if (channels.includes("tenant_sms") && tenantPhone) {
        try {
          await sendSMS(tenantPhone, tenantMsg);
          sent.push("tenant_sms");
          addAudit({ actor: "agent", action: "visit-confirmation", requestId: job?.requestId, jobId: job?.id, vendorId: job?.vendorId, meta: { channel: "tenant_sms", to: tenantPhone } });
        } catch (e: any) {
          errors.push({ channel: "tenant_sms", error: e?.message || "sms failed" });
        }
      }
      if (channels.includes("vendor_sms") && vendorPhone) {
        try {
          await sendSMS(vendorPhone, vendorMsg);
          sent.push("vendor_sms");
          addAudit({ actor: "agent", action: "visit-confirmation", requestId: job?.requestId, jobId: job?.id, vendorId: job?.vendorId, meta: { channel: "vendor_sms", to: vendorPhone } });
        } catch (e: any) {
          errors.push({ channel: "vendor_sms", error: e?.message || "sms failed" });
        }
      }

      return { ok: true, sent, errors };
    }

    /* >>> NEW PROPERTY LISTING ACTIONS <<< */
    case "property-create-listing": {
      const out = computeListingSuggestion(input || {});
      addAudit({
        actor: "agent",
        action: "property-create-listing",
        meta: {
          propertyId: input?.propertyId ?? null,
          propertyName: input?.propertyName ?? null,
          priceSuggested: (out as any)?.result?.priceSuggested ?? null,
        },
      });
      return out;
    }
    case "property-publish-listing": {
      const out = mockPublishListing(input || {});
      const sites = Array.isArray(input?.sites) ? input.sites : ["streeteasy", "rent.com"];
      for (const s of sites) {
        addAudit({
          actor: "agent",
          action: "property-publish-listing",
          meta: {
            propertyId: input?.propertyId ?? null,
            site: s,
            price: input?.price ?? null,
          },
        });
      }
      return out;
    }

    default:
      return { error: `unknown action: ${action}` };
  }
}

/* ================================ AUDIT API ================================ */
router.get("/audit", (req, res) => {
  const { actor, action, requestId, jobId } = req.query as Record<string, string | undefined>;
  const items = listAudit({ actor, action, requestId, jobId });
  res.json({ items });
});


/* ========================= SLA timers for a request (moved up) ============ */
router.get("/requests/:id/sla", (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const r = REQUESTS.find((x) => x.id === id) || null;

    const firstResponseMin = 60;
    const resolutionMin = 1440;

    const createdAt = r ? new Date(r.createdAt) : new Date(Date.now() - 10 * 60 * 1000);
    const now = new Date();
    const minsSinceCreate = Math.max(0, Math.round((now.getTime() - createdAt.getTime()) / 60000));

    const firstRemaining = Math.max(0, firstResponseMin - minsSinceCreate);
    const resolutionRemaining = Math.max(0, resolutionMin - minsSinceCreate);

    res.json({
      requestId: id,
      policy: { firstResponseMin, resolutionMin },
      timers: {
        firstResponse: { remainingMin: firstRemaining, overdue: minsSinceCreate > firstResponseMin },
        resolution: { remainingMin: resolutionRemaining, overdue: minsSinceCreate > resolutionMin },
      },
      generatedAt: now.toISOString(),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "sla compute failed" });
  }
});

console.log("✅ Loaded /api routes");
export default router;
