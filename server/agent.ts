// server/agent.ts
import { db } from "./storage";
import { requests as requestsTable } from "./storage";
import { vendors } from "./storage";
import { agentDrafts, agentRuns } from "./storage";
import { nanoid } from "nanoid";

// Change this if you already have a helper
const genId = () => nanoid(21);

// Replace with real LLM later; for now we make a smart mock
async function callLLMMock(input: {
  subject?: string | null;
  body?: string | null;
}) {
  const text = `${input.subject || ""} ${input.body || ""}`.toLowerCase();
  const isPlumbing =
    text.includes("leak") || text.includes("faucet") || text.includes("water");
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

export async function runAgentForRequest(requestId: string) {
  // Load the request
  const reqRows = await db
    .select()
    .from(requestsTable)
    .where((f, { eq }) => eq(f.id, requestId));

  const req = reqRows[0];
  if (!req) return;

  // (Optional) pull vendors to build context later
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
