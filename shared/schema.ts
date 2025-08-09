import { z } from "zod";

// Property request schemas
export const propertyRequestSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
  propertyAddress: z.string().min(1, "Property address is required"),
  unitNumber: z.string().optional(),
  tenantReported: z.boolean().default(false),
  emergency: z.boolean().default(false),
});

export const suggestionResponseSchema = z.object({
  summary: z.string(),
  category: z.enum(["plumbing", "electrical", "hvac", "locks", "general"]),
  priority: z.enum(["urgent", "high", "normal", "low"]),
  sla_due: z.string(), // ISO date string
  vendor_recommendation: z.object({
    id: z.string(),
    name: z.string(),
    trade: z.string(),
    contact: z.string(),
    rating: z.number().min(0).max(5),
  }),
  drafts: z.object({
    vendor_message: z.string(),
    tenant_update: z.string(),
  }),
});

export const approveRequestSchema = z.object({
  requestId: z.string(),
  vendorId: z.string(),
  notes: z.string().optional(),
});

export const feedbackSchema = z.object({
  requestId: z.string(),
  rating: z.number().min(1).max(5),
  comments: z.string().optional(),
  completed: z.boolean(),
});

// Dashboard data schemas
export const dashboardStatsSchema = z.object({
  activeRequests: z.number(),
  urgentIssues: z.number(),
  slaCompliance: z.number(),
  avgResolutionDays: z.number(),
});

export const requestSchema = z.object({
  id: z.string(),
  propertyAddress: z.string(),
  unitNumber: z.string().optional(),
  description: z.string(),
  category: z.enum(["plumbing", "electrical", "hvac", "locks", "general"]),
  priority: z.enum(["urgent", "high", "normal", "low"]),
  status: z.enum(["open", "assigned", "in_progress", "completed", "cancelled"]),
  slaHoursLeft: z.number(),
  createdAt: z.string(),
  assignedVendor: z.string().optional(),
});

export const vendorSchema = z.object({
  id: z.string(),
  name: z.string(),
  trade: z.string(),
  rating: z.number(),
  jobsCompleted: z.number(),
  contact: z.string(),
});

// Type exports
export type PropertyRequest = z.infer<typeof propertyRequestSchema>;
export type SuggestionResponse = z.infer<typeof suggestionResponseSchema>;
export type ApproveRequest = z.infer<typeof approveRequestSchema>;
export type Feedback = z.infer<typeof feedbackSchema>;
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
export type Request = z.infer<typeof requestSchema>;
export type Vendor = z.infer<typeof vendorSchema>;
