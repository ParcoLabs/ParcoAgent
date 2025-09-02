export type RequestCategory = "Plumbing" | "HVAC" | "Electrical" | "Cleaning" | "Other";

export interface RequestDTO {
  id: string;
  propertyId: string;
  category: RequestCategory;
  status: "new" | "triaging" | "scheduled" | "in_progress" | "closed";
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface VendorDTO {
  id: string;
  name: string;
  category: string;
  rating?: number;
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
