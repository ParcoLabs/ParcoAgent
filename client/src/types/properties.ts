// client/src/types/properties.ts
export type PropertyStatus = "Active" | "Under Review" | "Archived";
export type PropertyType = "Multifamily" | "Single Family" | "Mixed Use" | "Retail" | "Office";

export interface PropertyRow {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  type: PropertyType;
  status: PropertyStatus;
  unitsTotal: number;
  occupancyPct: number; // 0..100
  ttmNOI: number;       // yearly NOI in USD
}

export interface UnitInfo {
  number: string;
  status: "Vacant" | "Occupied";
  rent: number;
  beds?: number;
  baths?: number;
}

export interface DocInfo {
  id: string;
  name: string;
  type: "pdf" | "image" | "doc";
  url?: string;
}

export interface ExpenseBreakdown {
  repairsPct: number;
  utilitiesPct: number;
  managementPct: number;
}

export interface PropertyDetail extends PropertyRow {
  class: "A" | "B" | "C";
  yearBuilt: number;
  owner: string;
  avgRent: number;
  capRate: number;
  expenseBreakdown: ExpenseBreakdown;

  // AI / Ops signals
  insights: string[];      // “Vacancy 45d in Unit 3A…”
  trends: string[];        // “Plumbing issues 3× vs last qtr…”
  compliance: {
    insuranceExpiresInDays?: number;
    missingVendorCOIs?: number;
    renewalsDueNext30?: number;
  };

  units: UnitInfo[];
  docs: DocInfo[];
}
