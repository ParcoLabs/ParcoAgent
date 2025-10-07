// client/src/lib/api.ts
import type { ZodTypeAny } from "zod";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH";

/**
 * BASE rules:
 * - If VITE_API_BASE_URL is set, use it (e.g., http://localhost:5000/api or http://localhost:5000)
 * - Otherwise default to same-origin "/api" (Vite dev proxy or server BFF path)
 */
export const BASE: string =
  (import.meta as any)?.env?.VITE_API_BASE_URL?.toString().replace(/\/$/, "") || "/api";

/**
 * Low-level API fetch helper.
 * Pass paths starting with "/" (e.g., "/requests") — we'll concat with BASE.
 */
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
    const text = await safeText(res);
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }

  // Some endpoints may return 204 No Content
  if (res.status === 204) return undefined as T;

  const json = await safeJson(res);
  return json as T;
}

/**
 * Zod-backed JSON parser for strict contracts.
 * Use this in your per-domain adapters (e.g., requests.api.ts)
 */
export async function parseJson<T>(res: Response, schema: ZodTypeAny): Promise<T> {
  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const data = await safeJson(res);
  return schema.parse(data);
}

/**
 * Convenience typed helpers that also support Zod validation.
 * Example:
 *   const res = await get("/requests", Request.array());
 */
export async function get<T = unknown>(path: string, schema?: ZodTypeAny): Promise<T> {
  const res = await fetch(`${BASE}${normalizePath(path)}`, {
    headers: baseHeaders(),
    method: "GET",
  });
  return schema ? parseJson<T>(res, schema) : (await res.json()) as T;
}

export async function post<T = unknown>(
  path: string,
  body?: any,
  schema?: ZodTypeAny
): Promise<T> {
  const res = await fetch(`${BASE}${normalizePath(path)}`, {
    method: "POST",
    headers: baseHeaders(true),
    body: body ? JSON.stringify(body) : undefined,
  });
  return schema ? parseJson<T>(res, schema) : (await res.json()) as T;
}

export async function put<T = unknown>(
  path: string,
  body?: any,
  schema?: ZodTypeAny
): Promise<T> {
  const res = await fetch(`${BASE}${normalizePath(path)}`, {
    method: "PUT",
    headers: baseHeaders(true),
    body: body ? JSON.stringify(body) : undefined,
  });
  return schema ? parseJson<T>(res, schema) : (await res.json()) as T;
}

export async function patch<T = unknown>(
  path: string,
  body?: any,
  schema?: ZodTypeAny
): Promise<T> {
  const res = await fetch(`${BASE}${normalizePath(path)}`, {
    method: "PATCH",
    headers: baseHeaders(true),
    body: body ? JSON.stringify(body) : undefined,
  });
  return schema ? parseJson<T>(res, schema) : (await res.json()) as T;
}

/**
 * Global queryFn for TanStack Query.
 * Expects queryKey[0] to be the API path (e.g. ["/requests"]).
 */
export async function queryFn<T = unknown>({ queryKey }: { queryKey: any }): Promise<T> {
  const [path] = queryKey as [string, any?];
  if (typeof path !== "string") {
    throw new Error("First queryKey entry must be a string path.");
  }
  return api<T>(path);
}

/* -------------------------------------------------------------------------- */
/*                               Domain Adapters                               */
/* -------------------------------------------------------------------------- */

// Shared types that tolerate DB enums ("EMAIL"/"SMS") and in-memory ("email"/"sms")
export type DraftChannel = "EMAIL" | "SMS" | "email" | "sms";
export type DraftStatusUI = "DRAFT" | "SENT" | "FAILED" | "PENDING";
export type DraftKind = "tenant_reply" | "vendor_outreach" | string;

export type Draft = {
  id: string;
  requestId: string;
  kind?: DraftKind;
  channel: DraftChannel;
  to: string;
  subject?: string;
  body: string;
  status: DraftStatusUI;
  createdAt: string;
  updatedAt?: string;
};

// Requests
export async function apiListRequests(): Promise<any[]> {
  // Backend returns a plain array in both mock and DB modes
  return get<any[]>("/requests");
}

// Drafts
export async function apiListDrafts(): Promise<Draft[]> {
  const rows = await get<any[]>("/drafts");
  // Normalize case differences if needed
  return rows.map((d) => ({
    ...d,
    channel: d.channel,
    status: d.status,
  })) as Draft[];
}

// Run agent (supports mode: "tenant_update" | "vendor_outreach" | "both")
export async function apiRunAgent(
  requestId: string,
  mode: "tenant_update" | "vendor_outreach" | "both" = "both"
): Promise<{ ok: boolean; created?: number }> {
  // Our route responds with { ok, created }
  return post<{ ok: boolean; created: number }>("/agent/run", { requestId, mode });
}

// Approve & send a draft
export async function apiApproveDraft(
  draftId: string
): Promise<{ ok: boolean } | { ok: true; sent: true }> {
  return post(`/agent/drafts/${draftId}/approve`);
}

// Assign a vendor to a request (demo-friendly)
export async function apiAssignVendor(
  requestId: string,
  vendorId: string,
  note?: string
): Promise<{ ok: boolean; result?: any }> {
  return post(`/requests/${requestId}/assign-vendor`, { vendorId, note });
}

/* ----------------- internals ----------------- */

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
