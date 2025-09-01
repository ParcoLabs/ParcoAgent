// client/src/lib/properties.api.ts
import type { PropertyDetail, PropertyRow, PropertyStatus, PropertyType } from "@/types/properties";

const USE_MOCKS = true;

// ---- MOCK DATA ----
const mockRows: PropertyRow[] = [
  {
    id: "p-225-pine",
    name: "225 Pine St",
    address: "225 Pine St",
    city: "San Francisco",
    state: "CA",
    type: "Multifamily",
    status: "Active",
    unitsTotal: 24,
    occupancyPct: 92,
    ttmNOI: 418000,
  },
  {
    id: "p-456-oak",
    name: "456 Oak Ave",
    address: "456 Oak Ave",
    city: "Austin",
    state: "TX",
    type: "Multifamily",
    status: "Active",
    unitsTotal: 8,
    occupancyPct: 100,
    ttmNOI: 181000,
  },
  {
    id: "p-12-maple",
    name: "12 Maple Ct",
    address: "12 Maple Ct",
    city: "Miami",
    state: "FL",
    type: "Mixed Use",
    status: "Under Review",
    unitsTotal: 16,
    occupancyPct: 88,
    ttmNOI: 233000,
  },
];

const mockDetails: Record<string, PropertyDetail> = {
  "p-225-pine": {
    ...mockRows[0],
    class: "B",
    yearBuilt: 2001,
    owner: "Pine Holdings LLC",
    avgRent: 2145,
    capRate: 6.3,
    expenseBreakdown: { repairsPct: 28, utilitiesPct: 22, managementPct: 12 },
    insights: [
      "Vacancy 45d in Unit 3A → est. lost rent $3.1k",
      "Repairs +22% MoM (plumbing concentration)",
    ],
    trends: [
      "Plumbing requests 3× vs last quarter",
      "Noise complaints centered near Unit 2B",
    ],
    compliance: { insuranceExpiresInDays: 28, missingVendorCOIs: 1, renewalsDueNext30: 2 },
    units: [
      { number: "3A", status: "Vacant", rent: 2050, beds: 2, baths: 1 },
      { number: "3B", status: "Occupied", rent: 2145, beds: 2, baths: 1 },
      { number: "2A", status: "Occupied", rent: 2190, beds: 2, baths: 1 },
    ],
    docs: [
      { id: "d1", name: "Master Lease Pack.pdf", type: "pdf" },
      { id: "d2", name: "Inspection 2025-06.jpg", type: "image" },
    ],
  },
  "p-456-oak": {
    ...mockRows[1],
    class: "A",
    yearBuilt: 2016,
    owner: "Oak RE Partners LP",
    avgRent: 1875,
    capRate: 5.8,
    expenseBreakdown: { repairsPct: 14, utilitiesPct: 18, managementPct: 11 },
    insights: ["Strong occupancy with above-market rents", "Consider rent review at renewals"],
    trends: ["HVAC seasonal tickets up 1.5× in July"],
    compliance: { insuranceExpiresInDays: 120, missingVendorCOIs: 0, renewalsDueNext30: 1 },
    units: [
      { number: "1A", status: "Occupied", rent: 1850, beds: 1, baths: 1 },
      { number: "1B", status: "Occupied", rent: 1900, beds: 1, baths: 1 },
    ],
    docs: [{ id: "d3", name: "Insurance Cert.pdf", type: "pdf" }],
  },
  "p-12-maple": {
    ...mockRows[2],
    class: "C",
    yearBuilt: 1989,
    owner: "Maple Ventures Inc.",
    avgRent: 1620,
    capRate: 7.1,
    expenseBreakdown: { repairsPct: 31, utilitiesPct: 24, managementPct: 13 },
    insights: ["Façade work advisable in next 12 months (~$60k)"],
    trends: ["Water usage up 12% MoM"],
    compliance: { insuranceExpiresInDays: 60, missingVendorCOIs: 2, renewalsDueNext30: 0 },
    units: [{ number: "2C", status: "Vacant", rent: 1550, beds: 1, baths: 1 }],
    docs: [{ id: "d4", name: "Zoning Letter.pdf", type: "pdf" }],
  },
};

export type ListParams = {
  search?: string;
  type?: PropertyType | "All";
  status?: PropertyStatus | "All";
  city?: string | "All";
  owner?: string;
  capRate?: string; // e.g., ">=6"
};

export async function fetchProperties(params: ListParams = {}): Promise<{ rows: PropertyRow[]; total: number }> {
  if (!USE_MOCKS) {
    // const res = await fetch(`/api/properties?` + new URLSearchParams(params as any));
    // return res.json();
  }
  let rows = [...mockRows];

  const { search, type, status, city } = params;
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(r => `${r.name} ${r.address} ${r.city} ${r.state}`.toLowerCase().includes(q));
  }
  if (type && type !== "All") rows = rows.filter(r => r.type === type);
  if (status && status !== "All") rows = rows.filter(r => r.status === status);
  if (city && city !== "All") rows = rows.filter(r => r.city.toLowerCase() === String(city).toLowerCase());
  return { rows, total: rows.length };
}

export async function fetchProperty(id: string): Promise<PropertyDetail | null> {
  if (!USE_MOCKS) {
    // const res = await fetch(`/api/properties/${id}`);
    // return res.json();
  }
  return mockDetails[id] ?? null;
}

export async function suggestPlans(propertyId: string): Promise<string[]> {
  if (!USE_MOCKS) {
    // const res = await fetch(`/api/properties/${propertyId}/plans`, { method: "POST" });
    // return res.json();
  }
  const prop = mockDetails[propertyId];
  if (!prop) return ["No suggestions available."];
  return [
    "Publish vacancy promo for Unit 3A (10% off first month, 12-month term).",
    "Schedule plumbing inspection for vertical stack A (3 units).",
    "Prepare owner update with NOI +6% YoY and maintenance trend.",
  ];
}

export async function applyPlan(_propertyId: string, _planText: string): Promise<{ ok: true }> {
  if (!USE_MOCKS) {
    // const res = await fetch(`/api/properties/${propertyId}/apply-plan`, { method: "POST", body: JSON.stringify({ planText }) });
    // return res.json();
  }
  return { ok: true };
}
