// server/db/repos.ts
import { db, exec } from "./client.js";
import { and, desc, eq } from "drizzle-orm";
import { requests, vendors, jobs, drafts, properties, appSettings } from "./schema.js";
import { sendEmail } from "../services/email.js";
import { sendSMS } from "../services/sms.js";

/* ========================= Schema bootstrap ========================= */
exec(`
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  created_at TEXT, tenant_name TEXT, property TEXT,
  category TEXT, priority TEXT, status TEXT,
  sla_due_at TEXT, summary TEXT, vendor_id TEXT
);
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT, email TEXT, phone TEXT, category TEXT, trade TEXT
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  request_id TEXT, vendor_id TEXT, status TEXT,
  created_at TEXT, started_at TEXT, completed_at TEXT,
  last_message_at TEXT, notes_json TEXT
);
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  request_id TEXT, kind TEXT, channel TEXT, "to" TEXT,
  subject TEXT, body TEXT, status TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  name TEXT, address TEXT
);
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  profile_json TEXT, property_json TEXT, channels_json TEXT, sla_json TEXT, rent_json TEXT
);
`);

function iso(ms = 0) { return new Date(Date.now() + ms).toISOString(); }
function safeParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback; try { return JSON.parse(s) as T; } catch { return fallback; }
}
const toJson = (v: any) => JSON.stringify(v ?? null);

/* ============================== Seeding ============================== */
async function seedIfEmpty() {
  const rq = await db.select().from(requests);
  const v = await db.select().from(vendors);
  const p = await db.select().from(properties);
  const s = await db.select().from(appSettings);

  if (v.length === 0) {
    await db.insert(vendors).values([
      { id: "V001", name: "AquaFix Pro", trade: "Plumbing", category: "Plumbing" },
      { id: "V002", name: "CoolAir Masters", trade: "HVAC", category: "HVAC" },
      { id: "V003", name: "Bright Electric", trade: "Electrical", category: "Electrical" },
    ]);
  }
  if (rq.length === 0) {
    await db.insert(requests).values([
      {
        id: "REQ-1001",
        createdAt: iso(-48 * 3600e3),
        tenantName: "Alicia Gomez",
        property: "Maple Grove Apts #3B",
        category: "Plumbing", priority: "High", status: "Open",
        slaDueAt: iso(6 * 3600e3),
        summary: "Kitchen sink leaking under cabinet; bucket filling every 2 hours.",
      },
      {
        id: "REQ-1002",
        createdAt: iso(-36 * 3600e3),
        tenantName: "Marcus Lee",
        property: "Oak Ridge #204",
        category: "HVAC", priority: "Urgent", status: "In Progress",
        slaDueAt: iso(2 * 3600e3),
        summary: "AC not cooling during heat wave; thermostat reads 85°F.",
      },
    ]);
  }
  if (p.length === 0) {
    await db.insert(properties).values([
      { id: "prop-225-pine", name: "225 Pine St", address: "225 Pine St, San Francisco, CA" },
      { id: "prop-456-oak", name: "456 Oak Ave", address: "456 Oak Ave, Kent, WA" },
      { id: "prop-12-maple", name: "12 Maple Ct", address: "12 Maple Ct, Miami, FL" },
    ]);
  }
  if (s.length === 0) {
    await db.insert(appSettings).values({
      id: "singleton",
      profileJson: toJson({ company: null, phone: null, timezone: null, smsNotifications: false }),
      propertyJson: toJson({ name: null, address: null, type: null, unitCount: null, rentCycle: "Monthly" }),
      channelsJson: toJson({ gmail: { connected: false }, sms: { connected: false }, portalEnabled: false }),
      slaJson: toJson({ rules: { leakHours: 4, noHeatHours: 6, normalHours: 48 } }),
      rentJson: toJson({ dueDay: 1, lateFeePercent: 5, reminderCadence: "3/5/7 days" }),
    });
  }
}
await seedIfEmpty();

/* =================== Bridge for legacy client IDs =================== */
async function ensureRequestExists(id: string) {
  const [existing] = await db.select().from(requests).where(eq(requests.id, id));
  if (existing) return existing;

  let summary = "Maintenance request";
  let category = "Other";
  let priority = "Medium";
  let property = "Unknown Unit";
  let tenantName = "Tenant";
  let status = "Open";

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

  const row = {
    id,
    createdAt: iso(-4 * 3600e3),
    tenantName,
    property,
    category,
    priority,
    status,
    slaDueAt: iso(24 * 3600e3),
    summary,
    vendorId: null as string | null,
  };
  await db.insert(requests).values(row);
  return row;
}

/* ============================== Requests/Vendors ============================== */
export async function listRequests() {
  return db.select().from(requests).orderBy(desc(requests.createdAt));
}
export async function listVendors() {
  return db.select().from(vendors).orderBy(vendors.name);
}

/* ============================== Properties ============================== */
export async function listProperties() {
  return db.select().from(properties).orderBy(properties.name);
}
export async function createProperty(input: { name: string; address?: string | null }) {
  const id = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6);
  const row = { id, name: input.name, address: input.address ?? null };
  await db.insert(properties).values(row);
  return row;
}
export async function updatePropertyRow(id: string, patch: { name?: string | null; address?: string | null }) {
  const updates: any = {};
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.address !== undefined) updates.address = patch.address;
  await db.update(properties).set(updates).where(eq(properties.id, id));
  const [row] = await db.select().from(properties).where(eq(properties.id, id));
  return row;
}

/* ============================== Jobs ============================== */
export async function linkVendorToRequest(reqId: string, vendorId: string, note: string | null) {
  const r = await ensureRequestExists(reqId);
  await db.update(requests).set({ vendorId }).where(eq(requests.id, r.id));

  const [existing] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.requestId, r.id), eq(jobs.vendorId, vendorId)));

  if (existing) return { ok: true, job: existing };

  const job = {
    id: `JOB-${Math.random().toString(36).slice(2, 9)}`,
    requestId: r.id,
    vendorId,
    status: "pending",
    createdAt: iso(),
    startedAt: null,
    completedAt: null,
    lastMessageAt: null,
    notesJson: note ? JSON.stringify([note]) : JSON.stringify([]),
  };
  await db.insert(jobs).values(job);
  return { ok: true, job };
}

export async function listVendorJobs() {
  const allJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  const reqIndex = new Map((await db.select().from(requests)).map(r => [r.id, r]));
  const vIndex = new Map((await db.select().from(vendors)).map(v => [v.id, v]));

  return allJobs.map(j => {
    const r = reqIndex.get(j.requestId);
    const v = vIndex.get(j.vendorId);
    const last = j.completedAt || j.startedAt || j.createdAt;
    const notes: string[] = safeParse(j.notesJson, []) ?? [];
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
      lastActivityAt: last,
      note: notes.at(-1) ?? null,
    };
  });
}

/* ============================== Drafts ============================== */
type NewDraft = {
  id: string;
  requestId: string;
  kind: "tenant_reply" | "vendor_outreach";
  channel: "email" | "sms";
  to: string;
  subject: string | null;
  body: string;
  status: "draft" | "sent" | "failed";
  createdAt: string;
};

export async function insertAgentDrafts(
  requestId: string,
  rows: Array<Omit<NewDraft, "id" | "createdAt" | "status">>
) {
  const now = iso();
  const payload: NewDraft[] = rows.map(d => ({
    id: `draft_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`,
    requestId,
    kind: d.kind,
    channel: d.channel,
    to: d.to,
    subject: d.subject ?? null,
    body: d.body,
    status: "draft",
    createdAt: now,
  }));
  if (payload.length) await db.insert(drafts).values(payload);
  return payload;
}

export async function listDrafts() {
  return db.select().from(drafts).orderBy(desc(drafts.createdAt));
}

export async function approveAndSendDraft(draftId: string) {
  const [d] = await db.select().from(drafts).where(eq(drafts.id, draftId));
  if (!d) throw new Error("draft not found");

  if (d.channel === "email") {
    const subject = d.subject || "Message from Parco PM";
    await sendEmail(d.to!, subject, d.body!);
  } else if (d.channel === "sms") {
    await sendSMS(d.to!, d.body!);
  }

  await db.update(drafts).set({ status: "sent" }).where(eq(drafts.id, draftId));
  return { ok: true, sent: true };
}

/* ============================== Settings ============================== */
type SettingsShape = {
  profile?: any;
  property?: any;
  channels?: any;
  sla?: any;
  rent?: any;
};

async function ensureSettingsRow() {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, "singleton"));
  if (row) return row;
  await db.insert(appSettings).values({
    id: "singleton",
    profileJson: toJson({ company: null, phone: null, timezone: null, smsNotifications: false }),
    propertyJson: toJson({ name: null, address: null, type: null, unitCount: null, rentCycle: "Monthly" }),
    channelsJson: toJson({ gmail: { connected: false }, sms: { connected: false }, portalEnabled: false }),
    slaJson: toJson({ rules: { leakHours: 4, noHeatHours: 6, normalHours: 48 } }),
    rentJson: toJson({ dueDay: 1, lateFeePercent: 5, reminderCadence: "3/5/7 days" }),
  });
  const [created] = await db.select().from(appSettings).where(eq(appSettings.id, "singleton"));
  return created;
}

export async function getSettingsFromDb() {
  const row = await ensureSettingsRow();
  return {
    profile: safeParse(row.profileJson, { company: null, phone: null, timezone: null, smsNotifications: false }),
    property: safeParse(row.propertyJson, { name: null, address: null, type: null, unitCount: null, rentCycle: "Monthly" }),
    channels: safeParse(row.channelsJson, { gmail: { connected: false }, sms: { connected: false }, portalEnabled: false }),
    sla: safeParse(row.slaJson, { rules: { leakHours: 4, noHeatHours: 6, normalHours: 48 } }),
    rent: safeParse(row.rentJson, { dueDay: 1, lateFeePercent: 5, reminderCadence: "3/5/7 days" }),
  };
}

export async function updateSettingsInDb(patch: SettingsShape) {
  const current = await getSettingsFromDb();
  const next = {
    profile: patch.profile ? { ...current.profile, ...patch.profile } : current.profile,
    property: patch.property ? { ...current.property, ...patch.property } : current.property,
    channels: patch.channels ? { ...current.channels, ...patch.channels } : current.channels,
    sla: patch.sla ? { ...current.sla, ...patch.sla } : current.sla,
    rent: patch.rent ? { ...current.rent, ...patch.rent } : current.rent,
  };

  await db
    .update(appSettings)
    .set({
      profileJson: toJson(next.profile),
      propertyJson: toJson(next.property),
      channelsJson: toJson(next.channels),
      slaJson: toJson(next.sla),
      rentJson: toJson(next.rent),
    })
    .where(eq(appSettings.id, "singleton"));

  return next;
}

export async function addVendorFromSettings(input: {
  name: string;
  email?: string | null;
  phone?: string | null;
  type?: string | null;
  serviceArea?: string | null;
}) {
  const id = `V${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  await db.insert(vendors).values({
    id,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    trade: input.type ?? null,
    category: input.type ?? null,
  });
  return { id, ...input };
}
