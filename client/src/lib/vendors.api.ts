// client/src/lib/vendors.api.ts
import type { BidOption, VendorCategory, VendorDetail, VendorRow, VendorStatus } from "@/types/vendors";

const USE_MOCKS = true;

// ---- MOCK DATA ----
const mockRows: VendorRow[] = [
  { id: "v-plumbfast", name: "PlumbFast Co.", category: "Plumbing", status: "Active", rating: 4.7, jobsYTD: 14, compliant: true },
  { id: "v-clearflow", name: "ClearFlow Plumbing", category: "Plumbing", status: "Active", rating: 4.5, jobsYTD: 9, compliant: false },
  { id: "v-hvacpro", name: "HVAC Pro Team", category: "HVAC", status: "Active", rating: 4.6, jobsYTD: 22, compliant: true },
  { id: "v-sparkelect", name: "Spark Electrical", category: "Electrical", status: "Probation", rating: 4.1, jobsYTD: 6, compliant: true },
];

const mockDetails: Record<string, VendorDetail> = {
  "v-plumbfast": {
    ...mockRows[0],
    phone: "+1-555-2001",
    email: "dispatch@plumbfast.com",
    notes: "Preferred for same-day emergencies",
    serviceArea: "SF Bay Area",
    performance: { onTimePct: 92, avgResponseHours: 1.2, tenantSatisfaction: 4.8, callbacksYTD: 2, avgJobCost: 475 },
    compliance: { coiExpiresInDays: 90, hasW9: true, licenses: [{ type: "C-36 Plumbing", expires: "2026-01-15" }] },
    invoices: [
      { invoiceId: "INV-182", amount: 525, bidAmount: 450, delta: 75, reason: "After-hours surcharge" },
      { invoiceId: "INV-179", amount: 380, bidAmount: 380, delta: 0 },
    ],
    insights: [
      "Avg response time 1.2h (top 10%).",
      "Costs up 8% QoQ; mostly after-hours surcharges.",
    ],
  },
  "v-clearflow": {
    ...mockRows[1],
    phone: "+1-555-2002",
    email: "jobs@clearflow.io",
    performance: { onTimePct: 88, avgResponseHours: 2.4, tenantSatisfaction: 4.6, callbacksYTD: 3, avgJobCost: 505 },
    compliance: { coiExpiresInDays: 14, hasW9: true, licenses: [{ type: "C-36 Plumbing", expires: "2025-10-20" }] },
    invoices: [{ invoiceId: "INV-301", amount: 520, bidAmount: 495, delta: 25, reason: "Materials variance" }],
    insights: ["COI expiring in 14 days.", "Slightly higher cost but good acceptance rate."],
  },
  "v-hvacpro": {
    ...mockRows[2],
    phone: "+1-555-2101",
    email: "ops@hvacpro.team",
    performance: { onTimePct: 89, avgResponseHours: 3.1, tenantSatisfaction: 4.7, callbacksYTD: 1, avgJobCost: 610 },
    compliance: { coiExpiresInDays: 120, hasW9: true, licenses: [{ type: "C-20 HVAC", expires: "2026-05-01" }] },
    invoices: [],
    insights: ["Peak-summer loads cause delay; recommend seasonal scheduling."],
  },
  "v-sparkelect": {
    ...mockRows[3],
    phone: "+1-555-2300",
    email: "office@spark-elect.com",
    performance: { onTimePct: 80, avgResponseHours: 4.0, tenantSatisfaction: 4.2, callbacksYTD: 4, avgJobCost: 690 },
    compliance: { coiExpiresInDays: 240, hasW9: true, licenses: [{ type: "C-10 Electrical", expires: "2027-03-12" }] },
    invoices: [{ invoiceId: "INV-98", amount: 740, bidAmount: 680, delta: 60, reason: "Scope increase (panel replace)" }],
    insights: ["On probation for late arrivals; improving trend last 30d."],
  },
};

export type ListParams = {
  search?: string;
  category?: VendorCategory | "All";
  status?: VendorStatus | "All";
  compliance?: "All" | "Compliant" | "At Risk";
  minRating?: number; // e.g., 4.5
};

export async function fetchVendors(params: ListParams = {}): Promise<{ rows: VendorRow[]; total: number }> {
  if (!USE_MOCKS) {
    // const res = await fetch(`/api/vendors?` + new URLSearchParams(params as any));
    // return res.json();
  }
  let rows = [...mockRows];
  const { search, category, status, compliance, minRating } = params;

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(r => `${r.name} ${r.category}`.toLowerCase().includes(q));
  }
  if (category && category !== "All") rows = rows.filter(r => r.category === category);
  if (status && status !== "All") rows = rows.filter(r => r.status === status);
  if (typeof minRating === "number") rows = rows.filter(r => r.rating >= minRating);
  if (compliance && compliance !== "All") {
    rows = rows.filter(r => (compliance === "Compliant" ? r.compliant : !r.compliant));
  }

  return { rows, total: rows.length };
}

export async function fetchVendor(id: string): Promise<VendorDetail | null> {
  if (!USE_MOCKS) {
    // const res = await fetch(`/api/vendors/${id}`);
    // return res.json();
  }
  return mockDetails[id] ?? null;
}

export async function requestBids(input: {
  category: VendorCategory;
  description: string;
  propertyId?: string;
  photos?: string[];
}): Promise<BidOption[]> {
  if (!USE_MOCKS) {
    // const res = await fetch(`/api/vendors/request-bids`, { method: "POST", body: JSON.stringify(input) });
    // return res.json();
  }
  // Very simple mocked “bids”
  return [
    { vendorId: "v-plumbfast", vendorName: "PlumbFast Co.", estimate: 450, earliestETAHours: 4, justification: "Fast response history, accepts urgent jobs." },
    { vendorId: "v-clearflow", vendorName: "ClearFlow Plumbing", estimate: 525, earliestETAHours: 8, justification: "Good workmanship; slightly higher cost." },
  ];
}

export async function approveBid(input: {
  vendorId: string;
  propertyId?: string;
  requestId?: string;
}): Promise<{ ok: true }> {
  if (!USE_MOCKS) {
    // const res = await fetch(`/api/vendors/approve-bid`, { method: "POST", body: JSON.stringify(input) });
    // return res.json();
  }
  return { ok: true };
}

export async function requestComplianceDocs(vendorId: string): Promise<{ ok: true }> {
  if (!USE_MOCKS) {
    // const res = await fetch(`/api/vendors/${vendorId}/request-compliance`, { method: "POST" });
    // return res.json();
  }
  return { ok: true };
}

export async function approveInvoice(_invoiceId: string): Promise<{ ok: true }> {
  if (!USE_MOCKS) {
    // const res = await fetch(`/api/payments/approve`, { method: "POST", body: JSON.stringify({ invoiceId }) });
    // return res.json();
  }
  return { ok: true };
}

export async function disputeInvoice(_invoiceId: string, _reason?: string): Promise<{ ok: true }> {
  if (!USE_MOCKS) {
    // const res = await fetch(`/api/payments/dispute`, { method: "POST", body: JSON.stringify({ invoiceId, reason }) });
    // return res.json();
  }
  return { ok: true };
}
