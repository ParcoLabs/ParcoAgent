import { sqliteTable, text } from "drizzle-orm/sqlite-core";

/* ===================== Requests/Vendors/Jobs/Drafts/Properties ===================== */
export const requests = sqliteTable("requests", {
  id: text("id").primaryKey(),
  createdAt: text("created_at"),
  tenantName: text("tenant_name"),
  property: text("property"),
  category: text("category"),
  priority: text("priority"),
  status: text("status"),
  slaDueAt: text("sla_due_at"),
  summary: text("summary"),
  vendorId: text("vendor_id"),
});

export const vendors = sqliteTable("vendors", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  category: text("category"),
  trade: text("trade"),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  requestId: text("request_id"),
  vendorId: text("vendor_id"),
  status: text("status"),
  createdAt: text("created_at"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  lastMessageAt: text("last_message_at"),
  notesJson: text("notes_json"),
});

export const drafts = sqliteTable("drafts", {
  id: text("id").primaryKey(),
  requestId: text("request_id"),
  kind: text("kind"),
  channel: text("channel"),
  to: text("to"),
  subject: text("subject"),
  body: text("body"),
  status: text("status"),
  createdAt: text("created_at"),
});

export const properties = sqliteTable("properties", {
  id: text("id").primaryKey(),
  name: text("name"),
  address: text("address"),
});

/* ================================ App Settings ===================================== */
/** Single-row table; we store each section as JSON text */
export const appSettings = sqliteTable("app_settings", {
  id: text("id").primaryKey(), // always 'singleton'
  profileJson: text("profile_json"),
  propertyJson: text("property_json"),
  channelsJson: text("channels_json"),
  slaJson: text("sla_json"),
  rentJson: text("rent_json"),
});
