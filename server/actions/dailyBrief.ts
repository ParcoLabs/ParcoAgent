// server/actions/dailyBrief.ts
import { sendEmail } from "../services/email.js";

// These are imported indirectly from routes' module scope.
// We'll accept them as injectable providers to avoid circular imports.
export type BriefDeps = {
  REQUESTS: Array<{
    id: string;
    createdAt: string;
    tenantName: string;
    property: string;
    category: string;
    priority: string;
    status: string;
    slaDueAt: string;
    summary: string;
  }>;
  JOBS: Array<{
    id: string;
    requestId: string;
    vendorId: string;
    status: "pending" | "in_progress" | "completed";
    createdAt: string;
    startedAt?: string | null;
    completedAt?: string | null;
    lastMessageAt?: string | null;
    notes?: string[];
    // visit?: { when: string; window?: string; note?: string } // optional
  }>;
  PROSPECTS: Array<{
    id: string;
    requestId: string;
    vendorId: string;
    vendorName: string;
    trade?: string | null;
    email?: string | null;
    phone?: string | null;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    note?: string | null;
  }>;
  NOTIFICATIONS?: Array<{
    id: string;
    message: string;
    type: string;
    timestamp: string;
  }>;
};

function formatDate(iso: string | undefined | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export function buildDailyBrief(deps: BriefDeps) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const overdueSLAs = deps.REQUESTS
    .filter((r) => new Date(r.slaDueAt).getTime() < now && r.status !== "Resolved")
    .sort((a, b) => new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime())
    .slice(0, 20);

  const jobsStuck = deps.JOBS
    .filter((j) => j.status !== "completed")
    .filter((j) => {
      const last = j.lastMessageAt || j.startedAt || j.createdAt;
      const lastMs = new Date(last).getTime();
      return now - lastMs > dayMs; // >24h
    })
    .sort((a, b) => {
      const la = new Date(a.lastMessageAt || a.startedAt || a.createdAt).getTime();
      const lb = new Date(b.lastMessageAt || b.startedAt || b.createdAt).getTime();
      return la - lb;
    })
    .slice(0, 20);

  const newProspects = deps.PROSPECTS
    .filter((p) => now - new Date(p.createdAt).getTime() <= dayMs)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  // If you later tag notifications with type: 'notice', we’ll pick them up here.
  const noticesSent = (deps.NOTIFICATIONS || []).filter((n) =>
    ["notice", "notice_sent"].includes(n.type)
  );

  const summaryLines: string[] = [];
  summaryLines.push(`Daily Brief — ${new Date().toLocaleString()}`);
  summaryLines.push("");
  summaryLines.push(`Overdue SLAs: ${overdueSLAs.length}`);
  overdueSLAs.forEach((r) =>
    summaryLines.push(
      `• ${r.id} — ${r.category} @ ${r.property} (prio ${r.priority}) — SLA due ${formatDate(
        r.slaDueAt
      )}`
    )
  );

  summaryLines.push("");
  summaryLines.push(`Jobs stuck >24h: ${jobsStuck.length}`);
  jobsStuck.forEach((j) => {
    const last = j.lastMessageAt || j.startedAt || j.createdAt;
    summaryLines.push(`• ${j.id} for ${j.requestId} — ${j.status} — last activity ${formatDate(last)}`);
  });

  summaryLines.push("");
  summaryLines.push(`New vendor prospects (last 24h): ${newProspects.length}`);
  newProspects.forEach((p) => {
    summaryLines.push(`• ${p.vendorName} (${p.trade || "general"}) — request ${p.requestId}`);
  });

  if (noticesSent.length > 0) {
    summaryLines.push("");
    summaryLines.push(`Notices sent: ${noticesSent.length}`);
    noticesSent.forEach((n) => summaryLines.push(`• ${formatDate(n.timestamp)} — ${n.message}`));
  }

  const text = summaryLines.join("\n");
  const brief = {
    generatedAt: new Date().toISOString(),
    counts: {
      overdueSLAs: overdueSLAs.length,
      jobsStuck: jobsStuck.length,
      newProspects: newProspects.length,
      noticesSent: noticesSent.length,
    },
    sections: {
      overdueSLAs,
      jobsStuck,
      newProspects,
      noticesSent,
    },
    text,
  };

  return brief;
}

export async function emailDailyBrief({
  to,
  briefText,
  subject = "Parco PM — Daily Brief",
}: {
  to: string;
  briefText: string;
  subject?: string;
}) {
  // Uses your existing Postmark wrapper; no-op if not configured.
  const result = await sendEmail(to, subject, briefText);
  return result;
}
