// client/src/lib/api.ts

/* ----------------------------------------------------------------------------
 * Base + core fetch helper
 * --------------------------------------------------------------------------*/

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const BASE: string =
  (import.meta as any)?.env?.VITE_API_BASE_URL?.toString().replace(/\/$/, "") || "/api";

function needsBody(method?: string) {
  const m = (method || "GET").toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH";
}

function normalizePath(p: string) {
  return p.startsWith("/") ? p : `/${p}`;
}

/** Error we throw from api() so callers can read .status and .data */
export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function api<T = any>(
  path: string,
  init?: { method?: HttpMethod; body?: any; headers?: Record<string, string> }
): Promise<T> {
  const method = (init?.method || "GET").toUpperCase() as HttpMethod;
  const url = `${BASE}${normalizePath(path)}`;

  // Headers: add JSON only when we send JSON (FormData/Blob pass-through)
  const headers: Record<string, string> = {
    ...(needsBody(method) ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers || {}),
  };

  // Prepare body
  let body = init?.body;
  const shouldDefault = needsBody(method) && body === undefined;
  if (shouldDefault) {
    body = "{}";
  } else if (
    body !== undefined &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer)
  ) {
    body = JSON.stringify(body);
  }

  const res = await fetch(url, { method, headers, body });

  // Try to decode JSON always; fall back to text
  const text = await res.text();
  const json = text ? safeParseJSON(text) : undefined;

  if (!res.ok) {
    const message =
      (json && (json.error || json.message)) ||
      `${res.status} ${res.statusText}`;
    throw new ApiError(message, res.status, json);
  }

  return (json as T) ?? (undefined as T);
}

function safeParseJSON(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/* ----------------------------------------------------------------------------
 * Small utilities
 * --------------------------------------------------------------------------*/

function q(obj: Record<string, any>) {
  const s = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return s ? `?${s}` : "";
}

/** TanStack Query global fn (some code may import this) */
export async function queryFn<T = unknown>({ queryKey }: { queryKey: any }): Promise<T> {
  const [path] = queryKey as [string, any?];
  if (typeof path !== "string") throw new Error("First queryKey entry must be a string path.");
  return api<T>(path);
}

/** Convenience wrappers — some files import these named helpers */
export function get<T = any>(path: string, headers?: Record<string, string>) {
  return api<T>(path, { method: "GET", headers });
}
export function post<T = any>(path: string, body?: any, headers?: Record<string, string>) {
  return api<T>(path, { method: "POST", body, headers });
}
export function put<T = any>(path: string, body?: any, headers?: Record<string, string>) {
  return api<T>(path, { method: "PUT", body, headers });
}
export function patch<T = any>(path: string, body?: any, headers?: Record<string, string>) {
  return api<T>(path, { method: "PATCH", body, headers });
}

/* ----------------------------------------------------------------------------
 * Domain types (lightweight)
 * --------------------------------------------------------------------------*/

export type AgentExecuteInput =
  | { action: string; payload?: Record<string, any> }
  | { steps: Array<{ action: string; input?: Record<string, any> }> };

/* ----------------------------------------------------------------------------
 * Adapters used across hooks/pages
 * --------------------------------------------------------------------------*/

// Requests & Drafts
export const apiListRequests = () => get("/requests");

// Create Request (manual entry from UI)
export const apiCreateRequest = (input: {
  summary: string;
  category: string;
  priority: string;
  property: string;
  tenantName?: string;
}) => post("/requests", input);

export const apiListDrafts = () => get<any[]>("/drafts");

// IMPORTANT: map UI "source_quotes" -> API "source-quotes"
export const apiRunAgent = (
  requestId: string,
  mode: "tenant_update" | "vendor_outreach" | "both" | "source-quotes" | "source_quotes"
) =>
  post("/agent/run", {
    requestId,
    mode: mode === "source_quotes" ? "source-quotes" : mode,
  });

export const apiApproveDraft = (draftId: string) =>
  post(`/agent/drafts/${draftId}/approve`, {});
export const apiAssignVendor = (requestId: string, vendorId: string, note?: string) =>
  post(`/requests/${requestId}/assign-vendor`, { vendorId, note });

// Vendors & Analytics
export const apiListVendors = () => get("/vendors");
export const apiDashboardStats = () => get("/dashboard/stats");
export const apiSlaAlerts = () => get("/sla-alerts");
export const apiNotifications = () => get("/notifications");
export const apiCategoryDistribution = () => get("/category-distribution");

// Vendor Jobs
export const apiListVendorJobs = () => get("/vendor-jobs");
export const apiJobProgress = (id: string, note?: string) =>
  post(`/jobs/${id}/progress`, { note });

// explicit proof attach (matches /jobs/:id/proof route)
export const apiJobProof = (id: string, payload: { url?: string; note?: string }) =>
  post(`/jobs/${id}/proof`, payload);

export const apiJobComplete = (id: string, note?: string) =>
  post(`/jobs/${id}/complete`, { note });

// Properties
export const apiListProperties = () => get("/properties");
export const apiCreateProperty = (input: { name: string; address?: string | null }) =>
  post("/properties", input);
export const apiUpdateProperty = (id: string, patch: { name?: string | null; address?: string | null }) =>
  put(`/properties/${id}`, patch);

// Demo Reset
export const apiDemoReset = () => post("/admin/reset", {});

// Agent Execute (single action or steps)
export const apiAgentExecute = (input: AgentExecuteInput) =>
  post("/agent/execute", input);

// Audit
export const apiAuditList = (filters?: { actor?: string; action?: string; requestId?: string; jobId?: string }) =>
  get<{ items: any[] }>(`/audit${q(filters || {})}`).then((r) => r.items);

// Prospects (Source 3 Quotes)
export const apiVendorProspects = () => get("/vendor-prospects");
export const apiApproveProspect = (
  id: string,
  payload?: { overrideReason?: string; estimate?: number; estimatedCost?: number; allowDuplicate?: boolean }
) =>
  post(`/vendor-prospects/${id}/approve`, {
    ...(payload?.estimate !== undefined ? { estimate: payload.estimate } : {}),
    ...(payload?.estimatedCost !== undefined ? { estimatedCost: payload.estimatedCost } : {}),
    ...(payload?.overrideReason ? { overrideReason: payload.overrideReason } : {}),
    ...(payload?.allowDuplicate !== undefined ? { allowDuplicate: payload.allowDuplicate } : {}),
  });

// Daily Brief
export const apiDailyBrief = () => get("/agent/daily-brief");
export const apiEmailDailyBrief = (email: string) =>
  post("/agent/daily-brief/email", { to: email });

// Ingest endpoints (Email/SMS -> create requests)
export const apiIngestEmail = (input: {
  from?: string; subject?: string; text?: string;
  property?: string; tenantName?: string; category?: string; priority?: string;
}) => post("/ingest/email", input);

export const apiIngestSms = (input: {
  from?: string; text?: string;
  property?: string; tenantName?: string; category?: string; priority?: string;
}) => post("/ingest/sms", input);
