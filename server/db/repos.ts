import { prisma } from "./client.js";
import type { Channel, DraftStatus, RequestStatus } from "@prisma/client";

// ---- Requests ----
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

// ---- Drafts ----
export async function listDrafts() {
  const rows = await prisma.draft.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      requestId: true,
      channel: true,
      to: true,
      subject: true,
      body: true,
      status: true,
      createdAt: true,
    },
  });
  return rows.map((d) => ({
    id: d.id,
    requestId: d.requestId,
    channel: d.channel as Channel,
    to: d.to,
    subject: d.subject ?? undefined,
    body: d.body,
    status: d.status as DraftStatus,
    createdAt: d.createdAt.toISOString(),
  }));
}

export async function approveAndSendDraft(draftId: string) {
  const draft = await prisma.draft.findUnique({ where: { id: draftId } });
  if (!draft) throw new Error("Draft not found");

  // Mark approved
  await prisma.draft.update({
    where: { id: draftId },
    data: { status: "APPROVED" },
  });

  // Create Message row (queued)
  const message = await prisma.message.create({
    data: {
      channel: draft.channel,
      to: draft.to,
      subject: draft.subject ?? undefined,
      body: draft.body,
      status: "QUEUED",
      draft: { connect: { id: draft.id } },
    },
  });

  // Try to deliver via your existing services
  let providerMessageId: string | undefined;
  let status: "SENT" | "FAILED" = "SENT";
  try {
    if (draft.channel === "EMAIL") {
      const { sendEmail } = await import("../services/email");
      const resp = await sendEmail({
        to: draft.to,
        subject: draft.subject ?? "(no subject)",
        html: draft.body,
      });
      providerMessageId = resp?.messageId ?? resp?.MessageID ?? undefined;
    } else {
      const { sendSMS } = await import("../services/sms");
      const resp = await sendSMS({ to: draft.to, body: draft.body });
      providerMessageId = resp?.sid ?? resp?.messageSid ?? undefined;
    }
  } catch (err) {
    status = "FAILED";
  }

  // Update Message + Draft final status
  await prisma.$transaction([
    prisma.message.update({
      where: { id: message.id },
      data: {
        status,
        providerMessageId,
        sentAt: status === "SENT" ? new Date() : null,
      },
    }),
    prisma.draft.update({
      where: { id: draft.id },
      data: { status: status === "SENT" ? "SENT" : "FAILED" },
    }),
  ]);

  return { ok: status === "SENT" } as const;
}

// ---- Vendors / Properties (readers for UI) ----
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
