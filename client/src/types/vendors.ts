// client/src/types/vendors.ts
export type VendorCategory =
  | "Plumbing"
  | "HVAC"
  | "Electrical"
  | "General Contractor"
  | "Cleaning"
  | "Landscaping"
  | "Other";

export type VendorStatus = "Active" | "Inactive" | "Probation";

export interface VendorRow {
  id: string;
  name: string;
  category: VendorCategory;
  status: VendorStatus;
  rating: number;         // 0..5
  jobsYTD: number;
  compliant: boolean;     // COI/licensing snapshot
}

export interface ComplianceInfo {
  coiExpiresInDays?: number;   // days until COI expiry
  hasW9?: boolean;
  licenses: Array<{ type: string; expires: string }>;
}

export interface Performance {
  onTimePct: number;           // %
  avgResponseHours: number;    // hours
  tenantSatisfaction: number;  // 0..5
  callbacksYTD: number;
  avgJobCost?: number;
}

export interface InvoiceFlag {
  invoiceId: string;
  amount: number;          // USD
  bidAmount?: number;      // USD
  delta?: number;          // USD (amount - bid)
  reason?: string;         // short explanation
}

export interface VendorDetail extends VendorRow {
  phone?: string;
  email?: string;
  notes?: string;
  serviceArea?: string;
  performance: Performance;
  compliance: ComplianceInfo;
  invoices: InvoiceFlag[];     // recent invoices + flags
  insights: string[];          // AI text bullets
}

export interface BidOption {
  vendorId: string;
  vendorName: string;
  estimate: number;       // USD
  earliestETAHours: number;
  justification: string;  // AI rationale
}
