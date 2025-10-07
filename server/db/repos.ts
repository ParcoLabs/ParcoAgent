import { prisma } from "./client.js";
import type { Channel, DraftStatus, RequestStatus } from "@prisma/client";

/* ================================= Requests ================================= */

export async function listRequests() {
  const rows = await prisma.request.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      propertyId: true,
      status: true,
      createdAt: true,
    },
  });
  // match shared/contracts Request shape
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    propertyId: r.propertyId,
    status: r.status as RequestStatus,
    createdAt: r.createdAt.toISOString(),
  }));
}

/* ================================= Drafts =================================== */
/** Return drafts for UI. Includes `kind` if present in your schema; otherwise falls back. */
export async function listDrafts() {
  const rows = await prisma.draft.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      requestId: true,
      // If your schema includes `kind`, this will select it;
      // if not, Prisma will complain at type-level. To avoid that,
      // keep it as any and fallback below.
      // @ts-ignore - tolerate absence of `kind` in some schemas
      kind: true,
      channel: true,
      to: true,
      subject: true,
      body: true,
      status: true,
      createdAt: true,
    } as any,
  });

  return rows.map((d: any) => ({
    id: d.id,
    requestId: d.requestId,
    kind: (d.kind as string) ?? "tenant_reply",
    channel: d.channel as Channel, // typically "EMAIL" | "SMS" in Prisma enum
    to: d.to,
    subject: d.subject ?? undefined,
    body: d.body,
    status: d.status as DraftStatus, // "DRAFT" | "SENT" | "FAILED" | etc.
    createdAt: (d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt)).toISOString(),
  }));
}

/* ============================= Approve & Send =============================== */

export async function approveAndSendDraft(draftId: string) {
  const draft = await prisma.draft.findUnique({ where: { id: draftId } });
  if (!draft) throw new Error("Draft not found");

  // Mark approved (optional step; keep for audit trail if you use it)
  try {
    await prisma.draft.update({
      where: { id: draftId },
      data: { status: "APPROVED" as DraftStatus },
    });
  } catch {
    // If your DraftStatus enum doesn't include APPROVED, ignore
  }

  // Create Message row (queued) if table exists; otherwise skip gracefully
  let messageId: string | null = null;
  try {
    const message = await prisma.message.create({
      data: {
        channel: draft.channel as Channel,
        to: draft.to,
        subject: draft.subject ?? undefined,
        body: draft.body,
        status: "QUEUED",
        draft: { connect: { id: draft.id } },
      },
    });
    messageId = message.id;
  } catch {
    // message table may not exist yet; continue
  }

  // Try to deliver via your existing services
  let providerMessageId: string | undefined;
  let finalStatus: "SENT" | "FAILED" = "SENT";
  try {
    if (draft.channel === "EMAIL") {
      // Use same signature as your in-memory route: (to, subject, body)
      const { sendEmail } = await import("../services/email.js");
      const resp = await sendEmail(draft.to, draft.subject ?? "(no subject)", draft.body);
      // common Postmark shapes
      providerMessageId = (resp && (resp.messageId || resp.MessageID)) ?? undefined;
    } else {
      const { sendSMS } = await import("../services/sms.js");
      const resp = await sendSMS(draft.to, draft.body);
      providerMessageId = (resp && (resp.sid || resp.messageSid)) ?? undefined;
    }
  } catch {
    finalStatus = "FAILED";
  }

  // Update Message + Draft final status (if message table exists)
  try {
    await prisma.$transaction([
      ...(messageId
        ? [
            prisma.message.update({
              where: { id: messageId },
              data: {
                status: finalStatus,
                providerMessageId,
                sentAt: finalStatus === "SENT" ? new Date() : null,
              },
            }),
          ]
        : []),
      prisma.draft.update({
        where: { id: draft.id },
        data: { status: finalStatus as DraftStatus },
      }),
    ]);
  } catch {
    // If message table doesn't exist, at least persist draft status
    await prisma.draft.update({
      where: { id: draft.id },
      data: { status: finalStatus as DraftStatus },
    });
  }

  return { ok: finalStatus === "SENT" } as const;
}

/* ============================ Vendors / Properties ========================== */

export async function listVendors() {
  return prisma.vendor.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, phone: true, category: true },
  });
}

export async function listProperties() {
  return prisma.property.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, address: true },
  });
}

/* ============================ Link Vendor to Request ======================== */
/**
 * Minimal "assign vendor" implementation that adapts to your schema.
 * 1) Try to set `request.vendorId` if that column exists.
 * 2) Else try to create a join row in `requestVendor` if that table exists.
 * 3) Else no-op but still return a consistent shape for the UI.
 */
export async function linkVendorToRequest(
  requestId: string,
  vendorId: string,
  note: string | null
) {
  // Attempt direct column
  try {
    const updated = await (prisma as any).request.update({
      where: { id: requestId },
      data: { vendorId },
      select: { id: true, /* @ts-ignore */ vendorId: true },
    });
    return { requestId: updated.id, vendorId: (updated as any).vendorId ?? vendorId, note };
  } catch {
    // Fall back to a join table if available
    try {
      const link = await (prisma as any).requestVendor.create({
        data: {
          requestId,
          vendorId,
          note: note ?? undefined,
        },
        select: { requestId: true, vendorId: true },
      });
      return { requestId: link.requestId, vendorId: link.vendorId, note };
    } catch {
      // Final fallback: no DB mutation, but keep UI flowing
      return { requestId, vendorId, note, warning: "Schema has no vendor link; update prisma schema to persist." };
    }
  }
}
