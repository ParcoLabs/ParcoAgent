// server/agent.ts
import { db } from "./storage";
import { requests as requestsTable } from "./storage";
import { vendors } from "./storage"; // kept in case you use later context
import { agentDrafts, agentRuns } from "./storage";
import { nanoid } from "nanoid";

// -------------------------------------------
// ID helper
// -------------------------------------------
const genId = () => nanoid(21);

// -------------------------------------------
// LLM mock (unchanged)
//
// Later, swap this for OpenAI/Anthropic, etc.
// -------------------------------------------
async function callLLMMock(input: { subject?: string | null; body?: string | null }) {
  const text = `${input.subject || ""} ${input.body || ""}`.toLowerCase();
  const isPlumbing = text.includes("leak") || text.includes("faucet") || text.includes("water");
  const category = isPlumbing ? "plumbing" : "other";
  const summary = isPlumbing
    ? "Tenant reports a possible plumbing issue (leak/faucet)."
    : "New request received.";

  return {
    summary,
    category,
    priority: isPlumbing ? "normal" : "low",
    drafts: [
      {
        kind: "tenant_reply",
        channel: "email",
        to: "tenant@example.com",
        subject: "We’re on it",
        body:
          "Thanks for reporting this. We’ll arrange a vendor visit and follow up with you on timing. Reply here if anything changes.",
      },
      {
        kind: "vendor_outreach",
        channel: "email",
        to: "plumber@example.com",
        subject: "Service Request",
        body:
          "Leak reported at Unit 3B. Please confirm availability tomorrow 10–12. Reply to confirm.",
      },
    ],
  };
}

// -------------------------------------------
// Exported: runAgentForRequest (unchanged)
// -------------------------------------------
export async function runAgentForRequest(requestId: string) {
  // Load the request
  const reqRows = await db
    .select()
    .from(requestsTable)
    .where((f, { eq }) => eq(f.id, requestId));

  const req = reqRows[0];
  if (!req) return;

  // record agent run
  await db.insert(agentRuns).values({
    id: genId(),
    requestId,
    status: "success",
    model: "mock",
    tokensIn: "0",
    tokensOut: "0",
  });

  const result = await callLLMMock({ subject: req.subject, body: req.body });

  for (const d of result.drafts) {
    await db.insert(agentDrafts).values({
      id: genId(),
      requestId,
      kind: d.kind as "tenant_reply" | "vendor_outreach",
      channel: d.channel as "email" | "sms",
      to: d.to,
      subject: d.subject || null,
      body: d.body,
      status: "draft",
      metadata: {
        summary: result.summary,
        category: result.category,
        priority: result.priority,
      },
    });
  }
}

// -------------------------------------------
// NEW: inbound email/SMS interpreter
//
// Detects a request id like "[REQ:REQ-1001]" anywhere in
// subject/body and classifies message intent.
// -------------------------------------------
export type Inbound = { subject?: string | null; text?: string | null };

const COMPLETE_WORDS = [
  "done",
  "completed",
  "finished",
  "fixed",
  "resolved",
  "all set",
  "wrapped up",
];
const PROGRESS_WORDS = [
  "started",
  "on site",
  "onsite",
  "in progress",
  "diagnosing",
  "picked up",
  "scheduled",
];

function findRequestId(str: string): string | null {
  const m = str.match(/\[REQ:([A-Za-z0-9\-_]+)\]/i);
  return m?.[1] ?? null;
}

function containsAny(hay: string, needles: string[]) {
  return needles.some((w) => hay.includes(w));
}

/**
 * analyzeInbound
 *  - Extracts requestId from "[REQ:<id>]"
 *  - Intent: "complete" if it contains any COMPLETE_WORDS
 *            "progress" if it contains any PROGRESS_WORDS
 *  - note: short text snippet (stored alongside job activity)
 */
export function analyzeInbound(
  evt: Inbound
): { requestId: string | null; intent: "complete" | "progress" | null; note?: string } {
  const subject = (evt.subject || "").toLowerCase();
  const text = (evt.text || "").toLowerCase();
  const blob = `${subject}\n${text}`;

  const requestId = findRequestId(blob);

  let intent: "complete" | "progress" | null = null;
  if (containsAny(blob, COMPLETE_WORDS)) intent = "complete";
  else if (containsAny(blob, PROGRESS_WORDS)) intent = "progress";

  const note = (evt.text || evt.subject || "").slice(0, 500);
  return { requestId, intent, note };
}
