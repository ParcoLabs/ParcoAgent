// client/src/types/requests.ts
export type RequestStatus =
  | "new"
  | "triaging"
  | "waiting_tenant"
  | "waiting_vendor"
  | "scheduled"
  | "in_progress"
  | "resolved"
  | "closed";

export type Priority = "P1" | "P2" | "P3";
export type Category =
  | "Plumbing"
  | "HVAC"
  | "Electrical"
  | "Billing"
  | "Leasing"
  | "Noise"
  | "Other";

export interface Request {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  priority: Priority;
  category: Category;
  propertyId: string;
  unit?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  slaDueAt?: string;
  attachments?: string[];
}

export interface Tenant {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  preferredChannel?: "email" | "sms";
}

export interface Vendor {
  id: string;
  name: string;
  category: Category;
  phone?: string;
  email?: string;
  rating?: number; // 0..5
  preferred?: boolean;
  etaMinutes?: number;
  notes?: string;
}

export interface TimelineEvent {
  id: string;
  type:
    | "created"
    | "note"
    | "message"
    | "vendor_assigned"
    | "scheduled"
    | "status_changed"
    | "closed";
  actor: "ai" | "tenant" | "pm" | "vendor" | "system";
  message: string;
  createdAt: string;
}

export interface RequestDetail extends Request {
  tenant?: Tenant;
  timeline?: TimelineEvent[];
  photos?: string[];
}
