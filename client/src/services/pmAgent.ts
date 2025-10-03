// client/src/services/pmAgent.ts
import { Draft, Request, Vendor, Property, type TDraft, type TRequest, type TVendor, type TProperty } from "../../../shared/contracts";

const BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (typeof process !== "undefined" ? (process as any).env?.VITE_API_BASE_URL : "") ||
  "http://localhost:5000";

async function parse<T>(res: Response, schema: any): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
  }
  const data = await res.json();
  return schema.parse(data);
}

export async function listDrafts(): Promise<TDraft[]> {
  const res = await fetch(`${BASE}/api/drafts`);
  return parse(res, Draft.array());
}

export async function approveDraft(id: string): Promise<{ ok: true }> {
  const res = await fetch(`${BASE}/api/agent/drafts/${id}/approve`, { method: "POST" });
  if (!res.ok) throw new Error(`Approve failed (HTTP ${res.status})`);
  return { ok: true };
}

export async function listRequests(): Promise<TRequest[]> {
  const res = await fetch(`${BASE}/api/requests`);
  return parse(res, Request.array());
}

export async function listVendors(): Promise<TVendor[]> {
  const res = await fetch(`${BASE}/api/vendors`);
  return parse(res, Vendor.array());
}

export async function listProperties(): Promise<TProperty[]> {
  const res = await fetch(`${BASE}/api/properties`);
  return parse(res, Property.array());
}
