// server/db/repos.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/* =============================================================================
 * In-memory fallbacks (used only if a DB call fails)
 * ========================================================================== */
type Id = string;

type VendorRow = { id: Id; name: string; email?: string | null; phone?: string | null; category?: string | null };
type PropertyRow = { id: Id; name: string; address?: string | null };
type RequestRow = {
  id: Id; title: string; description?: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt?: string; updatedAt?: string;
  property: { id: Id; name: string };
  reporter?: { id: Id; name: string; email?: string | null } | null;
};
type ProspectRow = {
  id: Id; requestId: Id; vendorId: Id; status: "pending" | "approved" | "rejected";
  estimatedCost?: number | null; note?: string | null; createdAt?: string; updatedAt?: string;
};
type JobStatus = "pending" | "in_progress" | "completed";
type JobRow = {
  id: Id; requestId: Id; vendorId: Id; status: JobStatus;
  title?: string | null;        // derived from related Request
  vendorName?: string | null;   // derived from related Vendor
  notes?: string[]; proofUrls?: string[];
  createdAt?: string; updatedAt?: string; completedAt?: string | null;
};
type DraftRow = {
  id: Id; requestId: Id; kind: "vendor_outreach" | "tenant_update";
  channel: "EMAIL" | "SMS"; to: string; subject?: string | null; body: string;
  status?: "PENDING" | "APPROVED" | "SENT" | "FAILED"; createdAt?: string;
};
type AuditRow = { id: Id; event: string; meta?: Record<string, any> | null; requestId?: string | null; createdAt?: string };

const MEM = {
  vendors: [] as VendorRow[],
  properties: [] as PropertyRow[],
  requests: [] as RequestRow[],
  drafts: [] as DraftRow[],
  prospects: [] as ProspectRow[],
  jobs: [] as JobRow[],
  audit: [] as AuditRow[],
};

/* =============================================================================
 * Helpers
 * ========================================================================== */
function gid(prefix: string) { return `${prefix}${Math.random().toString(36).slice(2, 9)}`; }

async function tryOrEmpty<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try { return await fn(); } catch (err: any) { console.error("[prisma:error]", err?.message || err); return [] as T[]; }
}
async function tryOrNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch (err: any) { console.error("[prisma:error]", err?.message || err); return null; }
}

/* =============================================================================
 * Vendors (DB-backed with fallback)
 * ========================================================================== */
export async function listVendors() {
  const rows = await tryOrEmpty(() =>
    prisma.vendor.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, phone: true, category: true },
    })
  );
  if (rows.length) return rows.map((v) => ({ ...v, trade: v.category ?? null }));
  return MEM.vendors.map((v) => ({ ...v, trade: v.category ?? null }));
}

export async function addVendorFromSettings(vendor: {
  name: string; email?: string | null; phone?: string | null; type?: string | null; serviceArea?: string | null;
}) {
  const created = await tryOrNull(() =>
    prisma.vendor.create({
      data: { name: vendor.name, email: vendor.email ?? null, phone: vendor.phone ?? null, category: vendor.type ?? null },
      select: { id: true, name: true, email: true, phone: true, category: true },
    })
  );
  if (created) return { ...created, trade: created.category };

  const row: VendorRow = { id: gid("V"), name: vendor.name, email: vendor.email ?? null, phone: vendor.phone ?? null, category: vendor.type ?? null };
  MEM.vendors.push(row);
  return { ...row, trade: row.category ?? null };
}

/* =============================================================================
 * Properties (DB-backed with fallback)
 * ========================================================================== */
export async function listProperties(): Promise<PropertyRow[]> {
  const rows = await tryOrEmpty(() =>
    prisma.property.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, address: true } })
  );
  if (rows.length) return rows;
  return [...MEM.properties];
}

export async function createProperty(input: { name: string; address?: string | null }) {
  const created = await tryOrNull(() =>
    prisma.property.create({ data: { name: input.name, address: input.address ?? null }, select: { id: true, name: true, address: true } })
  );
  if (created) return created;

  const row: PropertyRow = { id: gid("P"), name: input.name, address: input.address ?? null };
  MEM.properties.push(row);
  return row;
}

export async function updatePropertyRow(id: string, input: { name?: string | null; address?: string | null }) {
  const updated = await tryOrNull(() =>
    prisma.property.update({
      where: { id },
      data: { ...(input.name !== undefined ? { name: input.name ?? null } : {}), ...(input.address !== undefined ? { address: input.address } : {}) },
      select: { id: true, name: true, address: true },
    })
  );
  if (updated) return updated;

  const idx = MEM.properties.findIndex((p) => p.id === id);
  if (idx >= 0) {
    MEM.properties[idx] = { ...MEM.properties[idx], ...(input.name !== undefined ? { name: input.name ?? `Property ${id}` } : {}), ...(input.address !== undefined ? { address: input.address } : {}) };
    return MEM.properties[idx];
  }
  const row: PropertyRow = { id, name: input.name ?? `Property ${id}`, address: input.address ?? null };
  MEM.properties.push(row);
  return row;
}

/* =============================================================================
 * Requests (DB-backed list with fallback)
 * ========================================================================== */
export async function listRequests(): Promise<RequestRow[]> {
  const rows = await tryOrEmpty(() =>
    prisma.request.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, description: true, status: true, createdAt: true, updatedAt: true,
        property: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, email: true } },
      },
    })
  );
  if (rows.length) {
    return rows.map((r) => ({
      id: r.id, title: r.title, description: r.description ?? null, status: r.status,
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
      property: { id: r.property.id, name: r.property.name },
      reporter: r.reporter ? { id: r.reporter.id, name: r.reporter.name, email: r.reporter.email ?? null } : null,
    }));
  }
  return [...MEM.requests];
}

/* =============================================================================
 * Drafts (keep in-memory for demo approve/send)
 * ========================================================================== */
const memDrafts: DraftRow[] = MEM.drafts;

export async function listDrafts() { return memDrafts; }
export async function insertAgentDrafts(requestId: string, drafts: DraftRow[]) {
  memDrafts.push(...drafts.map((d) => ({ ...d, requestId, id: d.id || gid("d_"), status: d.status ?? "PENDING", createdAt: d.createdAt || new Date().toISOString() })));
  return { inserted: drafts.length };
}
export async function approveAndSendDraft(id: string) {
  const d = memDrafts.find((x) => x.id === id);
  if (!d) throw new Error("draft not found");
  d.status = "SENT";
  return { ok: true, sent: true, id };
}

/* =============================================================================
 * Prospects (DB-backed) — “Sourced Vendors (Pending)”
 * ========================================================================== */
export async function listProspects(filters?: { requestId?: Id; vendorId?: Id }): Promise<ProspectRow[]> {
  const rows = await tryOrEmpty(() =>
    prisma.prospect.findMany({
      where: { ...(filters?.requestId ? { requestId: filters.requestId } : {}), ...(filters?.vendorId ? { vendorId: filters.vendorId } : {}) },
      orderBy: { createdAt: "desc" },
      select: { id: true, requestId: true, vendorId: true, status: true, estimatedCost: true, note: true, createdAt: true, updatedAt: true },
    })
  );
  if (rows.length) {
    return rows.map((p) => ({
      id: p.id, requestId: p.requestId, vendorId: p.vendorId,
      status: p.status as any, estimatedCost: p.estimatedCost ?? null, note: p.note ?? null,
      createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
    }));
  }
  return MEM.prospects
    .filter((p) => (!filters?.requestId || p.requestId === filters.requestId) && (!filters?.vendorId || p.vendorId === filters.vendorId))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function createProspects(bulk: Array<{ requestId: Id; vendorId: Id; note?: string | null }>) {
  if (!bulk.length) return { created: 0, rows: [] as ProspectRow[] };
  const createdRows = await tryOrNull(async () => {
    await prisma.prospect.createMany({ data: bulk.map((b) => ({ requestId: b.requestId, vendorId: b.vendorId, status: "pending", note: b.note ?? null })) });
    return prisma.prospect.findMany({
      where: { requestId: { in: [...new Set(bulk.map((b) => b.requestId))] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, requestId: true, vendorId: true, status: true, estimatedCost: true, note: true, createdAt: true, updatedAt: true },
    });
  });
  if (createdRows) {
    const mapped: ProspectRow[] = createdRows.map((p) => ({
      id: p.id, requestId: p.requestId, vendorId: p.vendorId,
      status: p.status as any, estimatedCost: p.estimatedCost ?? null, note: p.note ?? null,
      createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
    }));
    return { created: mapped.length, rows: mapped };
  }
  const mem = bulk.map((b) => ({
    id: gid("PR"), requestId: b.requestId, vendorId: b.vendorId,
    status: "pending" as const, estimatedCost: null, note: b.note ?? null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }));
  MEM.prospects.push(...mem);
  return { created: mem.length, rows: mem };
}

/**
 * Award flow (approval) — now does all of this:
 *  - marks this prospect APPROVED (+ optional estimatedCost/note)
 *  - marks other prospects for the same request REJECTED with note
 *  - creates a Job for the awarded vendor
 *  - (optional) enqueues a vendor notification as an in-memory Draft
 */
export async function approveProspect(
  prospectId: Id,
  opts: { estimatedCost?: number | null; note?: string | null; force?: boolean; reason?: string; notifyVendor?: boolean }
) {
  // First, approve the selected prospect and fetch context we need
  const winner = await tryOrNull(async () => {
    return await prisma.$transaction(async (tx) => {
      const approved = await tx.prospect.update({
        where: { id: prospectId },
        data: {
          status: "approved",
          ...(opts.estimatedCost !== undefined ? { estimatedCost: opts.estimatedCost } : {}),
          ...(opts.note !== undefined ? { note: opts.note } : {}),
        },
        select: { id: true, requestId: true, vendorId: true, estimatedCost: true },
      });

      // Decline others for the same request
      await tx.prospect.updateMany({
        where: { requestId: approved.requestId, NOT: { id: approved.id } },
        data: { status: "rejected", note: "Another vendor was awarded" },
      });

      // Create Job for the awarded vendor
      const job = await tx.job.create({
        data: { requestId: approved.requestId, vendorId: approved.vendorId, status: "pending", notes: [], proofUrls: [] },
        select: {
          id: true, requestId: true, vendorId: true, status: true, notes: true, proofUrls: true,
          createdAt: true, updatedAt: true, completedAt: true,
          request: { select: { title: true } },
          vendor: { select: { name: true, email: true, phone: true } },
        },
      });

      return { approved, job };
    });
  });

  if (winner) {
    // Optional vendor notification (in-memory draft so demo stays safe)
    if (opts.notifyVendor) {
      const to = winner.job.vendor?.email || winner.job.vendor?.phone || "";
      if (to) {
        const subject = `Work awarded: ${winner.job.request?.title || "Service request"}`;
        const body =
          `Hi ${winner.job.vendor?.name || "there"},\n\n` +
          `You’ve been awarded the job for: ${winner.job.request?.title || "Service request"}.\n` +
          (opts.estimatedCost != null ? `Estimated cost: $${opts.estimatedCost}\n` : "") +
          `We’ll follow up with scheduling details.\n\n— Parco PM`;
        await insertAgentDrafts(winner.approved.requestId, [
          {
            id: gid("d_"),
            requestId: winner.approved.requestId,
            kind: "vendor_outreach",
            channel: /@/.test(to) ? "EMAIL" : "SMS",
            to,
            subject: /@/.test(to) ? subject : undefined,
            body,
            status: "PENDING",
          },
        ]);
      }
    }

    // Return approved prospect row
    return {
      id: winner.approved.id,
      requestId: winner.approved.requestId,
      vendorId: winner.approved.vendorId,
      status: "approved" as const,
      estimatedCost: winner.approved.estimatedCost ?? null,
      note: opts.note ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ProspectRow;
  }

  // Fallback (in-memory) — approve, reject others, add job
  const idx = MEM.prospects.findIndex((p) => p.id === prospectId);
  if (idx < 0) throw new Error("prospect not found");
  const reqId = MEM.prospects[idx].requestId;
  const venId = MEM.prospects[idx].vendorId;

  MEM.prospects[idx] = {
    ...MEM.prospects[idx],
    status: "approved",
    ...(opts.estimatedCost !== undefined ? { estimatedCost: opts.estimatedCost } : {}),
    ...(opts.note !== undefined ? { note: opts.note } : {}),
    updatedAt: new Date().toISOString(),
  };
  // decline others
  MEM.prospects = MEM.prospects.map((p) =>
    p.requestId === reqId && p.id !== prospectId ? { ...p, status: "rejected", note: "Another vendor was awarded" } : p
  );
  // add job
  const jobRow: JobRow = {
    id: gid("J"), requestId: reqId, vendorId: venId, status: "pending",
    notes: [], proofUrls: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: null,
  };
  MEM.jobs.push(jobRow);

  // optional vendor notification (in-memory draft)
  if (opts.notifyVendor) {
    await insertAgentDrafts(reqId, [
      {
        id: gid("d_"),
        requestId: reqId,
        kind: "vendor_outreach",
        channel: "EMAIL",
        to: "vendor@example.com",
        subject: "Work awarded",
        body: "You’ve been awarded the job.",
        status: "PENDING",
      },
    ]);
  }

  return MEM.prospects[idx];
}

/* =============================================================================
 * Jobs (DB-backed) — returns title & vendorName for richer UI
 * ========================================================================== */
export async function listVendorJobs(filters?: { vendorId?: Id; requestId?: Id }): Promise<JobRow[]> {
  const rows = await tryOrEmpty(() =>
    prisma.job.findMany({
      where: { ...(filters?.vendorId ? { vendorId: filters.vendorId } : {}), ...(filters?.requestId ? { requestId: filters.requestId } : {}) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, requestId: true, vendorId: true, status: true, notes: true, proofUrls: true, createdAt: true, updatedAt: true, completedAt: true,
        request: { select: { title: true } },          // join Request
        vendor: { select: { name: true } },            // join Vendor
      },
    })
  );
  if (rows.length) {
    return rows.map((j) => ({
      id: j.id,
      requestId: j.requestId,
      vendorId: j.vendorId,
      status: j.status as JobStatus,
      title: j.request?.title ?? null,
      vendorName: j.vendor?.name ?? null,
      notes: (j.notes as string[] | null) ?? [],
      proofUrls: (j.proofUrls as string[] | null) ?? [],
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
      completedAt: j.completedAt ? j.completedAt.toISOString() : null,
    }));
  }

  // Fallback
  return MEM.jobs
    .filter((j) => (!filters?.vendorId || j.vendorId === filters.vendorId) && (!filters?.requestId || j.requestId === filters.requestId))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function linkVendorToRequest(requestId: Id, vendorId: Id, note?: string | null): Promise<JobRow> {
  const created = await tryOrNull(() =>
    prisma.job.create({
      data: { requestId, vendorId, status: "pending", notes: note ? [note] : [], proofUrls: [] },
      select: {
        id: true, requestId: true, vendorId: true, status: true, notes: true, proofUrls: true, createdAt: true, updatedAt: true, completedAt: true,
        request: { select: { title: true } }, vendor: { select: { name: true } },
      },
    })
  );
  if (created) {
    return {
      id: created.id, requestId: created.requestId, vendorId: created.vendorId,
      status: created.status as JobStatus,
      title: created.request?.title ?? null, vendorName: created.vendor?.name ?? null,
      notes: (created.notes as string[] | null) ?? [], proofUrls: (created.proofUrls as string[] | null) ?? [],
      createdAt: created.createdAt.toISOString(), updatedAt: created.updatedAt.toISOString(),
      completedAt: created.completedAt ? created.completedAt.toISOString() : null,
    };
  }

  // Fallback
  const row: JobRow = {
    id: gid("J"), requestId, vendorId, status: "pending",
    title: null, vendorName: null,
    notes: note ? [note] : [], proofUrls: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: null,
  };
  MEM.jobs.push(row);
  return row;
}

export async function jobProgress(id: Id, note?: string | null): Promise<JobRow> {
  const updated = await tryOrNull(async () => {
    const j = await prisma.job.findUnique({
      where: { id },
      select: {
        id: true, requestId: true, vendorId: true, status: true, notes: true, proofUrls: true, createdAt: true, updatedAt: true, completedAt: true,
        request: { select: { title: true } }, vendor: { select: { name: true } },
      },
    });
    if (!j) throw new Error("job not found");
    const nextNotes = Array.isArray(j.notes as any) ? ([...(j.notes as any), ...(note ? [note] : [])] as string[]) : note ? [note] : [];
    const u = await prisma.job.update({
      where: { id },
      data: { status: "in_progress", notes: nextNotes },
      select: {
        id: true, requestId: true, vendorId: true, status: true, notes: true, proofUrls: true, createdAt: true, updatedAt: true, completedAt: true,
        request: { select: { title: true } }, vendor: { select: { name: true } },
      },
    });
    return u;
  });
  if (updated) {
    return {
      id: updated.id, requestId: updated.requestId, vendorId: updated.vendorId,
      status: updated.status as JobStatus,
      title: (updated as any).request?.title ?? null, vendorName: (updated as any).vendor?.name ?? null,
      notes: (updated.notes as string[] | null) ?? [], proofUrls: (updated.proofUrls as string[] | null) ?? [],
      createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(),
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
    };
  }

  // Fallback
  const idx = MEM.jobs.findIndex((j) => j.id === id);
  if (idx < 0) throw new Error("job not found");
  MEM.jobs[idx].status = "in_progress";
  if (note) MEM.jobs[idx].notes = [...(MEM.jobs[idx].notes || []), note];
  MEM.jobs[idx].updatedAt = new Date().toISOString();
  return MEM.jobs[idx];
}

export async function jobAddProof(id: Id, proof: { url?: string; note?: string }): Promise<JobRow> {
  const updated = await tryOrNull(async () => {
    const j = await prisma.job.findUnique({
      where: { id },
      select: {
        id: true, requestId: true, vendorId: true, status: true, notes: true, proofUrls: true, createdAt: true, updatedAt: true, completedAt: true,
        request: { select: { title: true } }, vendor: { select: { name: true } },
      },
    });
    if (!j) throw new Error("job not found");
    const nextProof = Array.isArray(j.proofUrls as any) ? ([...(j.proofUrls as any), ...(proof.url ? [proof.url] : [])] as string[]) : proof.url ? [proof.url] : [];
    const nextNotes = Array.isArray(j.notes as any) ? ([...(j.notes as any), ...(proof.note ? [proof.note] : [])] as string[]) : proof.note ? [proof.note] : [];
    const u = await prisma.job.update({
      where: { id },
      data: { proofUrls: nextProof, notes: nextNotes },
      select: {
        id: true, requestId: true, vendorId: true, status: true, notes: true, proofUrls: true, createdAt: true, updatedAt: true, completedAt: true,
        request: { select: { title: true } }, vendor: { select: { name: true } },
      },
    });
    return u;
  });
  if (updated) {
    return {
      id: updated.id, requestId: updated.requestId, vendorId: updated.vendorId,
      status: updated.status as JobStatus,
      title: (updated as any).request?.title ?? null, vendorName: (updated as any).vendor?.name ?? null,
      notes: (updated.notes as string[] | null) ?? [], proofUrls: (updated.proofUrls as string[] | null) ?? [],
      createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(),
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
    };
  }

  // Fallback
  const idx = MEM.jobs.findIndex((j) => j.id === id);
  if (idx < 0) throw new Error("job not found");
  if (proof.url) MEM.jobs[idx].proofUrls = [...(MEM.jobs[idx].proofUrls || []), proof.url];
  if (proof.note) MEM.jobs[idx].notes = [...(MEM.jobs[idx].notes || []), proof.note];
  MEM.jobs[idx].updatedAt = new Date().toISOString();
  return MEM.jobs[idx];
}

export async function jobComplete(id: Id, opts: { note?: string; force?: boolean; reason?: string }): Promise<JobRow> {
  const updated = await tryOrNull(async () => {
    const u = await prisma.job.update({
      where: { id },
      data: {
        status: "completed",
        completedAt: new Date(),
        notes: {
          set: undefined,
          push: [
            ...(opts.note ? [opts.note] : []),
            ...(opts.reason ? [`override: ${opts.reason}`] : []),
          ] as any,
        } as any,
      },
      select: {
        id: true, requestId: true, vendorId: true, status: true, notes: true, proofUrls: true, createdAt: true, updatedAt: true, completedAt: true,
        request: { select: { title: true } }, vendor: { select: { name: true } },
      },
    });
    return u;
  });
  if (updated) {
    return {
      id: updated.id, requestId: updated.requestId, vendorId: updated.vendorId,
      status: updated.status as JobStatus,
      title: (updated as any).request?.title ?? null, vendorName: (updated as any).vendor?.name ?? null,
      notes: (updated.notes as string[] | null) ?? [], proofUrls: (updated.proofUrls as string[] | null) ?? [],
      createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(),
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
    };
  }

  // Fallback
  const idx = MEM.jobs.findIndex((j) => j.id === id);
  if (idx < 0) throw new Error("job not found");
  MEM.jobs[idx].status = "completed";
  MEM.jobs[idx].completedAt = new Date().toISOString();
  if (opts.note) MEM.jobs[idx].notes = [...(MEM.jobs[idx].notes || []), opts.note];
  if (opts.reason) MEM.jobs[idx].notes = [...(MEM.jobs[idx].notes || []), `override: ${opts.reason}`];
  MEM.jobs[idx].updatedAt = new Date().toISOString();
  return MEM.jobs[idx];
}

/* =============================================================================
 * Audit (DB-backed with fallback)
 * ========================================================================== */
export async function appendAudit(event: { type: string; actor?: string | null; message: string; meta?: Record<string, any> | null; requestId?: string | null; }) {
  const eventString = event.actor && event.actor.trim().length > 0
    ? `[${event.type}] (${event.actor}) ${event.message}`
    : `[${event.type}] ${event.message}`;

  const created = await tryOrNull(() =>
    prisma.auditLog.create({
      data: { event: eventString, meta: event.meta ?? null, requestId: event.requestId ?? null },
      select: { id: true, event: true, meta: true, requestId: true, createdAt: true },
    })
  );
  if (created) return { id: created.id, event: created.event, meta: (created as any).meta ?? null, requestId: (created as any).requestId ?? null, createdAt: created.createdAt.toISOString() } as AuditRow;

  const row: AuditRow = { id: gid("A"), event: eventString, meta: event.meta ?? null, requestId: event.requestId ?? null, createdAt: new Date().toISOString() };
  MEM.audit.push(row);
  return row;
}

export async function listAudit(limit = 100): Promise<AuditRow[]> {
  const rows = await tryOrEmpty(() =>
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit, select: { id: true, event: true, meta: true, requestId: true, createdAt: true } })
  );
  if (rows.length) return rows.map((a) => ({ id: a.id, event: a.event, meta: (a as any).meta ?? null, requestId: (a as any).requestId ?? null, createdAt: a.createdAt.toISOString() }));
  return [...MEM.audit].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, limit);
}

/* =============================================================================
 * Settings stubs
 * ========================================================================== */
export async function getSettingsFromDb() { return { profile: {}, property: {}, channels: {}, sla: {}, rent: {} }; }
export async function updateSettingsInDb(_: any) { return getSettingsFromDb(); }

/* =============================================================================
 * Admin / Demo reset
 * ========================================================================== */
export async function adminResetDemoData() {
  try {
    await prisma.auditLog.deleteMany().catch(() => {});
    await prisma.job.deleteMany().catch(() => {});
    await prisma.prospect.deleteMany().catch(() => {});
    await prisma.message.deleteMany().catch(() => {});
    await prisma.draft.deleteMany().catch(() => {});
    await prisma.notification.deleteMany().catch(() => {});
    await prisma.request.deleteMany().catch(() => {});
    await prisma.slaPolicy.deleteMany().catch(() => {});
    await prisma.property.deleteMany().catch(() => {});
    await prisma.vendor.deleteMany().catch(() => {});
  } catch (e: any) {
    console.warn("[adminResetDemoData] partial DB reset:", e?.message || e);
  }

  MEM.vendors.length = 0;
  MEM.properties.length = 0;
  MEM.requests.length = 0;
  MEM.drafts.length = 0;
  MEM.prospects.length = 0;
  MEM.jobs.length = 0;
  MEM.audit.length = 0;

  try {
    const storage: any = await import("../storage.js");
    if (typeof storage.resetAll === "function") await storage.resetAll();
    else if (typeof storage.clearAll === "function") await storage.clearAll();
    else ["JOBS", "PROSPECTS", "DRAFTS", "REQUESTS", "VENDORS", "AUDIT"].forEach((k) => {
      if (Array.isArray((storage as any)[k])) (storage as any)[k].length = 0;
    });
  } catch (e: any) {
    console.warn("[adminResetDemoData] no storage.js reset available:", e?.message || e);
  }

  return { ok: true };
}
