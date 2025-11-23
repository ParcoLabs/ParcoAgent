// client/src/lib/vendors.api.ts
import { get, post } from "./api";

// Directory
export async function apiListVendors() {
  return get<any[]>("/vendors");
}

// Jobs
export async function apiListVendorJobs() {
  return get<any[]>("/vendor-jobs");
}
export async function apiJobProgress(id: string, note?: string) {
  return post(`/jobs/${id}/progress`, { note });
}
export async function apiJobComplete(id: string, note?: string) {
  return post(`/jobs/${id}/complete`, { note });
}

// Prospects (human-in-the-loop)
export async function apiListVendorProspects() {
  return get<any[]>("/vendor-prospects");
}
export async function apiApproveVendorProspect(id: string) {
  return post(`/vendor-prospects/${id}/approve`);
}
