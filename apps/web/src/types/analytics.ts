// client/src/types/analytics.ts

export type GroupBy = "week" | "month" | "quarter";

export interface AnalyticsFilters {
  from?: string;       // ISO date
  to?: string;         // ISO date
  propertyId?: string; // optional
  category?: string;   // "Plumbing" | "HVAC" | ...
  vendorId?: string;
  groupBy?: GroupBy;
}

export interface KPIResponse {
  occupancyPct: number;
  avgRent: number;
  capRate: number;
  ttmNOI: number;

  slaHitPct: number;
  avgResponseHrs: number;
  costPerWO: number;

  compliancePct: number;
  backlog7: number;
  backlog30: number;
}

export interface SeriesPoint {
  x: string; // label
  y: number; // value
  y2?: number; // optional second series value
}

export interface SpendBreakdown {
  label: string; // category name
  value: number; // USD
}

export interface VendorPerfPoint {
  vendorId: string;
  vendorName: string;
  onTimePct: number;
  avgCost: number; // USD
}

export interface InsightsResponse {
  bullets: string[];
}
