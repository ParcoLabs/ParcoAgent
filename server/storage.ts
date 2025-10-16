// server/storage.ts

// ─────────────────────────────────────────────────────────────────────────────
// Types you already had
// ─────────────────────────────────────────────────────────────────────────────
export type Settings = {
  profile: {
    company?: string | null;
    phone?: string | null;
    timezone?: string | null;
    smsNotifications?: boolean;
  };
  property: {
    name?: string | null;
    address?: string | null;
    type?: string | null;
    unitCount?: number | null;
    rentCycle?: "Monthly" | "Weekly" | "Annual" | null;
  };
  channels: {
    gmail: { connected: boolean };
    sms: { connected: boolean };
    portalEnabled: boolean;
  };
  sla: {
    rules: {
      leakHours: number;
      noHeatHours: number;
      normalHours: number;
    };
  };
  rent: {
    dueDay: number; // 1..28
    lateFeePercent: number;
    reminderCadence: string;
  };
  vendors: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    type?: string | null;
    serviceArea?: string | null;
  }>;
  tenants: Array<{
    id: string;
    name: string;
    unit: string;
    lease_start?: string;
    lease_end?: string;
    rent?: number;
    email?: string;
    phone?: string;
  }>;
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Agent types (assistive mode)
// ─────────────────────────────────────────────────────────────────────────────
export type AgentDraft = {
  id: string;
  requestId: string;
  kind: "tenant_reply" | "vendor_outreach";
  channel: "email" | "sms";
  to: string;
  subject?: string | null;
  body: string;
  vendorId?: string | null;
  status: "draft" | "sent";
  metadata?: Record<string, any>;
  createdAt: string; // ISO timestamp
};

export type AgentRun = {
  id: string;
  requestId: string;
  status: "success" | "error";
  model?: string | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  error?: string | null;
  createdAt: string; // ISO timestamp
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
const nowIso = () => new Date().toISOString();

// ─────────────────────────────────────────────────────────────────────────────
/** In-memory store (swap to DB later) */
// ─────────────────────────────────────────────────────────────────────────────
const store: Settings = {
  profile: { company: null, phone: null, timezone: null, smsNotifications: false },
  property: { name: null, address: null, type: null, unitCount: null, rentCycle: "Monthly" },
  channels: { gmail: { connected: false }, sms: { connected: false }, portalEnabled: false },
  sla: { rules: { leakHours: 4, noHeatHours: 6, normalHours: 48 } },
  rent: { dueDay: 1, lateFeePercent: 5, reminderCadence: "3/5/7 days" },
  vendors: [],
  tenants: [],
};

// NEW: in-memory “tables” for the agent
const agentDraftsStore: AgentDraft[] = [];
const agentRunsStore: AgentRun[] = [];

// ─────────────────────────────────────────────────────────────────────────────
/** Accessors you already had */
// ─────────────────────────────────────────────────────────────────────────────
export function getSettings(): Settings {
  return store;
}

export function updateProperty(payload: Partial<Settings["property"]>) {
  store.property = { ...store.property, ...payload };
}

export function updateChannels(payload: Partial<Settings["channels"]>) {
  store.channels = {
    gmail: { connected: payload.gmail?.connected ?? store.channels.gmail.connected },
    sms: { connected: payload.sms?.connected ?? store.channels.sms.connected },
    portalEnabled:
      payload.portalEnabled !== undefined ? payload.portalEnabled : store.channels.portalEnabled,
  };
}

export function addVendor(v: Omit<Settings["vendors"][number], "id">) {
  const vendor = { id: uid(), ...v };
  store.vendors.push(vendor);
  return vendor;
}

export function updateSla(payload: Settings["sla"]) {
  store.sla = payload;
}

export function updateRent(payload: Partial<Settings["rent"]>) {
  store.rent = { ...store.rent, ...payload };
}

export function importTenants(rows: Array<Omit<Settings["tenants"][number], "id">>) {
  let inserted = 0;
  let errors = 0;
  rows.forEach((r) => {
    if (!r || !r.name || !r.unit) {
      errors++;
      return;
    }
    store.tenants.push({ id: uid(), ...r });
    inserted++;
  });
  return { inserted, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Agent helpers (used by /api/agent/* routes)
// ─────────────────────────────────────────────────────────────────────────────

// Add a single draft
export function addAgentDraft(
  d: Omit<AgentDraft, "id" | "createdAt" | "status"> & { status?: AgentDraft["status"] }
): AgentDraft {
  const draft: AgentDraft = {
    id: uid(),
    createdAt: nowIso(),
    status: d.status ?? "draft",
    ...d,
  };
  agentDraftsStore.push(draft);
  return draft;
}

// Add multiple drafts at once
export function addAgentDrafts(
  requestId: string,
  drafts: Array<
    Omit<AgentDraft, "id" | "createdAt" | "status" | "requestId"> & {
      status?: AgentDraft["status"];
    }
  >
): AgentDraft[] {
  const created = drafts.map((d) =>
    addAgentDraft({
      requestId,
      ...d,
      status: d.status ?? "draft",
    })
  );
  return created;
}

// List drafts for a request
export function listAgentDrafts(requestId: string): AgentDraft[] {
  return agentDraftsStore.filter((d) => d.requestId === requestId);
}

// Mark a draft as sent
export function markAgentDraftSent(id: string): boolean {
  const i = agentDraftsStore.findIndex((d) => d.id === id);
  if (i === -1) return false;
  agentDraftsStore[i] = { ...agentDraftsStore[i], status: "sent" };
  return true;
}

// Record an agent run (for audit)
export function addAgentRun(run: Omit<AgentRun, "id" | "createdAt">): AgentRun {
  const row: AgentRun = { id: uid(), createdAt: nowIso(), ...run };
  agentRunsStore.push(row);
  return row;
}

export function getAgentDraftById(id: string): AgentDraft | undefined {
  return agentDraftsStore.find((d) => d.id === id);
}

// (Optional) expose stores for debugging/dev tools
export const __agentDraftsStore = agentDraftsStore;
export const __agentRunsStore = agentRunsStore;

// ─────────────────────────────────────────────────────────────────────────────
// NEW: reset for Demo Reset endpoint
// ─────────────────────────────────────────────────────────────────────────────
export function resetAgentStorage() {
  agentDraftsStore.length = 0;
  agentRunsStore.length = 0;
  return { drafts: 0, runs: 0 };
}
