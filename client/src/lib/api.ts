// client/src/lib/api.ts
import type { ZodTypeAny } from "zod";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** BASE:
 * - If VITE_API_BASE_URL is set, use it (e.g., http://localhost:5000 or http://localhost:5000/api)
 * - Else default to same-origin "/api"
 */
export const BASE: string =
  (import.meta as any)?.env?.VITE_API_BASE_URL?.toString().replace(/\/$/, "") || "/api";

/* ----------------------------------------------------------------------------
 * Low-level helpers
 * --------------------------------------------------------------------------*/
export async function api<T = unknown>(
  path: string,
  opts: { method?: HttpMethod; body?: any; headers?: Record<string, string> } = {}
): Promise<T> {
  const url = `${BASE}${normalizePath(path)}`;
  const headers: Record<string, string> = {
    ...(opts.body ? { "Content-Type": "application/json" } : {}),
    ...(import.meta.env.VITE_API_KEY ? { "x-api-key": String(import.meta.env.VITE_API_KEY) } : {}),
    ...(opts.headers || {}),
  };

  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    throw new Error((await safeText(res)) || res.statusText || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await safeJson(res)) as T;
}

export async function parseJson<T>(res: Response, schema: ZodTypeAny): Promise<T> {
  if (!res.ok) throw new Error((await safeText(res)) || res.statusText || `HTTP ${res.status}`);
  if (res.status === 204) return undefined as T;
  const data = await safeJson(res);
  return schema.parse(data);
}

export async function get<T = unknown>(path: string, schema?: ZodTypeAny): Promise<T> {
  const res = await fetch(`${BASE}${normalizePath(path)}`, { headers: baseHeaders(), method: "GET" });
  return schema ? parseJson<T>(res, schema) : ((await res.json()) as T);
}

export async function post<T = unknown>(path: string, body?: any, schema?: ZodTypeAny): Promise<T> {
  const res = await fetch(`${BASE}${normalizePath(path)}`, {
    method: "POST",
    headers: baseHeaders(true),
    body: body ? JSON.stringify(body) : undefined,
  });
  return schema ? parseJson<T>(res, schema) : ((await res.json()) as T);
}

export async function put<T = unknown>(path: string, body?: any, schema?: ZodTypeAny): Promise<T> {
  const res = await fetch(`${BASE}${normalizePath(path)}`, {
    method: "PUT",
    headers: baseHeaders(true),
    body: body ? JSON.stringify(body) : undefined,
  });
  return schema ? parseJson<T>(res, schema) : ((await res.json()) as T);
}

export async function patch<T = unknown>(path: string, body?: any, schema?: ZodTypeAny): Promise<T> {
  const res = await fetch(`${BASE}${normalizePath(path)}`, {
    method: "PATCH",
    headers: baseHeaders(true),
    body: body ? JSON.stringify(body) : undefined,
  });
  return schema ? parseJson<T>(res, schema) : ((await res.json()) as T);
}

/** Global queryFn for TanStack Query. Expects queryKey[0] to be an API path string. */
export async function queryFn<T = unknown>({ queryKey }: { queryKey: any }): Promise<T> {
  const [path] = queryKey as [string, any?];
  if (typeof path !== "string") throw new Error("First queryKey entry must be a string path.");
  return api<T>(path);
}

/* ----------------------------------------------------------------------------
 * Domain models (tolerant of DB vs in-memory shapes)
 * --------------------------------------------------------------------------*/
export type DraftChannel = "EMAIL" | "SMS" | "email" | "sms";
export type DraftStatusUI = "DRAFT" | "SENT" | "FAILED" | "PENDING";
export type DraftKind = "tenant_reply" | "vendor_outreach" | string;

export type Draft = {
  id: string;
  requestId: string;
  kind?: DraftKind;
  channel: DraftChannel; // normalized to "EMAIL" | "SMS" by adapter below
  to: string;
  subject?: string;
  body: string;
  status: DraftStatusUI; // normalized to "DRAFT" | "SENT" | "FAILED"
  createdAt: string;
  updatedAt?: string;
};

export type RequestLite = {
  id: string;
  title?: string;
  description?: string;
  propertyId?: string;
  status?: string;
  createdAt?: string;
  // mock-only fields (from routes.ts)
  tenantName?: string;
  property?: string;
  category?: "Plumbing" | "Electrical" | "HVAC" | "Noise" | "Other";
  priority?: "Low" | "Medium" | "High" | "Urgent";
  slaDueAt?: string;
  summary?: string;
  vendorId?: string;
};

export type Vendor = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
};

export type DashboardStats = {
  activeRequests: number;
  urgentIssues: number;
  slaCompliance: number;
  avgResolutionDays: number;
};

export type SlaAlert = {
  id: string;
  propertyAddress: string;
  category: string;
  priority: string;
  hoursLeft: number;
};

/** 🆕 Job type for /jobs endpoints */
export type Job = {
  id: string;
  requestId: string;
  vendorId: string;
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  lastMessageAt?: string | null;
  notes?: string[];
};

/* ----------------------------------------------------------------------------
 * Adapters (Requests, Drafts, Vendors, Dashboard, Agent, Jobs, Compose)
 * --------------------------------------------------------------------------*/

// Requests
export async function apiListRequests(): Promise<RequestLite[]> {
  return get<RequestLite[]>("/requests");
}

// Drafts
export async function apiListDrafts(): Promise<Draft[]> {
  const rows = await get<any[]>("/drafts");
  return rows.map((d) => {
    const ch = (d.channel ?? "").toString().toUpperCase();
    const st = (d.status ?? "").toString().toUpperCase();
    return {
      ...d,
      channel: ch === "EMAIL" || ch === "SMS" ? ch : (ch === "E" ? "EMAIL" : "SMS"),
      status: st === "SENT" || st === "FAILED" ? st : "DRAFT",
      createdAt: d.createdAt ?? new Date().toISOString(),
    } as Draft;
  });
}

// Run agent (supports mode)
export async function apiRunAgent(
  requestId: string,
  mode: "tenant_update" | "vendor_outreach" | "both" = "both"
): Promise<{ ok: boolean; created: number; mode?: string }> {
  return post("/agent/run", { requestId, mode });
}

// Approve & send a draft
export async function apiApproveDraft(
  draftId: string
): Promise<{ ok: boolean } | { ok: true; sent: true }> {
  return post(`/agent/drafts/${draftId}/approve`);
}

// Assign vendor to request
export async function apiAssignVendor(
  requestId: string,
  vendorId: string,
  note?: string
): Promise<{ ok: boolean; requestId?: string; vendorId?: string; result?: any; job?: any }> {
  return post(`/requests/${requestId}/assign-vendor`, { vendorId, note });
}

// Vendors
export async function apiListVendors(): Promise<Vendor[]> {
  return get<Vendor[]>("/vendors");
}

// Dashboard / analytics
export async function apiDashboardStats(): Promise<DashboardStats> {
  return get<DashboardStats>("/dashboard/stats");
}
export async function apiSlaAlerts(): Promise<SlaAlert[]> {
  return get<SlaAlert[]>("/sla-alerts");
}
export async function apiNotifications(): Promise<any[]> {
  return get<any[]>("/notifications");
}
export async function apiCategoryDistribution(): Promise<Array<{ category: string; percentage: number }>> {
  return get("/category-distribution");
}

/* ------------------------------- Vendor Jobs ------------------------------- */
export async function apiListVendorJobs(): Promise<any[]> {
  return get<any[]>("/vendor-jobs");
}
// wrapper (avoids curly-brace re-export that broke your build)
export async function apiVendorJobs(): Promise<any[]> {
  return apiListVendorJobs();
}
export async function apiJobProgress(id: string, note?: string) {
  return post(`/jobs/${id}/progress`, { note });
}
export async function apiJobComplete(id: string, note?: string) {
  return post(`/jobs/${id}/complete`, { note });
}

/** 🆕 General Jobs list with optional filters vendorId/requestId */
export async function apiListJobs(filters?: { vendorId?: string; requestId?: string }): Promise<Job[]> {
  const params = new URLSearchParams();
  if (filters?.vendorId) params.set("vendorId", filters.vendorId);
  if (filters?.requestId) params.set("requestId", filters.requestId);
  const qs = params.toString();
  return get<Job[]>(`/jobs${qs ? `?${qs}` : ""}`);
}

/* --------------------------------- Compose -------------------------------- */
export async function apiComposeMessage(input: {
  target: "tenant" | "vendor";
  request: {
    id: string;
    summary: string;
    category?: string;
    priority?: string;
    property?: string;
  };
  tone?: "neutral" | "friendly" | "firm";
}): Promise<{ subject: string; body: string }> {
  return post("/compose/message", input);
}

/* ----------------------------------------------------------------------------
 * internals
 * --------------------------------------------------------------------------*/
function normalizePath(p: string): string {
  return p.startsWith("/") ? p : `/${p}`;
}
async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
function baseHeaders(withJson = false): Record<string, string> {
  return {
    ...(withJson ? { "Content-Type": "application/json" } : {}),
    ...(import.meta.env.VITE_API_KEY ? { "x-api-key": String(import.meta.env.VITE_API_KEY) } : {}),
  };
}

// --- Properties API ---
export type Property = {
  id: string;
  name: string;
  address?: string | null;
  // optional stats used by your list UI
  units?: number;
  occ?: number;      // integer percent (e.g., 92)
  noiTtm?: number;   // number in dollars
};

export async function apiListProperties(): Promise<Property[]> {
  return get<Property[]>("/properties");
}

export async function apiCreateProperty(input: { name: string; address?: string | null }): Promise<{ ok: true; property: Property }> {
  return post<{ ok: true; property: Property }>("/properties", input);
}

export async function apiUpdateProperty(
  id: string,
  patch: { name?: string | null; address?: string | null }
): Promise<{ ok: true; property: Property }> {
  return put<{ ok: true; property: Property }>(`/properties/${id}`, patch);
}

/* 🆕 Demo Reset */
export async function apiDemoReset(): Promise<{ ok: true; requests: number; jobs: number; properties: number }> {
  return post("/admin/reset");
}
