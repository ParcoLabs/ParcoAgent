// shared/contracts.ts
import { z } from "zod";

export const Role = z.enum(["MANAGER", "TENANT", "VENDOR"]);
export const Channel = z.enum(["EMAIL", "SMS"]);
export const DraftStatus = z.enum(["PENDING", "APPROVED", "SENT", "FAILED"]);
export const RequestStatus = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]);

export const Vendor = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  category: z.string().optional(),
});

export const Property = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().optional(),
});

export const Request = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  propertyId: z.string(),
  status: RequestStatus,
  createdAt: z.string(),
});

export const Draft = z.object({
  id: z.string(),
  requestId: z.string(),
  channel: Channel,
  to: z.string(),                // email or phone
  subject: z.string().optional(),
  body: z.string(),
  status: DraftStatus,
  createdAt: z.string(),
});

export type TVendor = z.infer<typeof Vendor>;
export type TProperty = z.infer<typeof Property>;
export type TRequest = z.infer<typeof Request>;
export type TDraft = z.infer<typeof Draft>;
