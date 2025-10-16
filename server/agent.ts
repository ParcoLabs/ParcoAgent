// server/agent.ts
// Uses OpenAI via Replit AI Integrations when USE_REAL_OPENAI=true.
// Generates two drafts (tenant + vendor). Vendor can be SMS when USE_SMS_FOR_VENDOR=true.

import { addAgentDraft, addAgentRun } from "./storage.js";
import { nanoid } from "nanoid";
import OpenAI from "openai";

const genId = () => nanoid(21);

// ---------- Flags & demo routing ----------
const USE_REAL_OPENAI = process.env.USE_REAL_OPENAI === "true";
const USE_SMS_FOR_VENDOR = String(process.env.USE_SMS_FOR_VENDOR || "").toLowerCase() === "true";

// Safe demo addresses/numbers
const TEST_TO_EMAIL = process.env.POSTMARK_TEST_TO || "operations@parcolabs.com";
const DEMO_VENDOR_SMS = process.env.SMS_DEMO_TO || "+15555550123";

// ---------- OpenAI client (Replit ModelFarm) ----------
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "dummy-key",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
});

// ---------- OpenAI-powered LLM ----------
async function callOpenAI(input: { subject?: string | null; body?: string | null; propertyInfo?: string }) {
  const systemPrompt = `You are a helpful property management assistant. Analyze the maintenance request and generate appropriate responses.

Return a JSON object with:
{
  "summary": "brief",
  "category": "plumbing|electrical|hvac|appliance|structural|pest|landscaping|other",
  "priority": "low|normal|high|urgent",
  "drafts": [
    {
      "kind": "tenant_reply",
      "channel": "email",
      "to": "tenant@example.com",
      "subject": "Subject line",
      "body": "Email body - be professional and reassuring"
    },
    {
      "kind": "vendor_outreach",
      "channel": "email",
      "to": "vendor@example.com",
      "subject": "Subject line",
      "body": "Email/SMS body - be clear about the issue and request availability"
    }
  ]
}`;

  const userPrompt = `Maintenance Request:
Subject: ${input.subject || "No subject"}
Body: ${input.body || "No body"}
Property Info: ${input.propertyInfo || "N/A"}

Please analyze this request and generate appropriate draft responses (JSON only).`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.6,
    max_tokens: 1000,
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("No response content from OpenAI");

  const parsed = JSON.parse(content);
  return {
    ...parsed,
    tokensUsed: {
      input: completion.usage?.prompt_tokens || 0,
      output: completion.usage?.completion_tokens || 0,
    },
  };
}

// ---------- Mock LLM ----------
async function callLLMMock(input: { subject?: string | null; body?: string | null }) {
  const text = `${input.subject || ""} ${input.body || ""}`.toLowerCase();
  const isPlumbing = /leak|faucet|water|pipe/.test(text);
  const isHVAC = /\bac\b|heating|air|temperature|cool/.test(text);
  const isElectrical = /outlet|switch|light|power|sparks/.test(text);

  let category = "other";
  let priority = "low";
  let summary = "New maintenance request received.";

  if (isPlumbing) { category = "plumbing"; priority = /flood|burst/.test(text) ? "urgent" : "normal"; summary = "Tenant reports a plumbing issue."; }
  else if (isHVAC) { category = "hvac"; priority = /no heat|no cooling|heat wave|85/.test(text) ? "high" : "normal"; summary = "Tenant reports HVAC issue."; }
  else if (isElectrical) { category = "electrical"; priority = /sparks|burning/.test(text) ? "urgent" : "normal"; summary = "Tenant reports electrical issue."; }

  return {
    summary,
    category,
    priority,
    drafts: [
      {
        kind: "tenant_reply",
        channel: "email",
        to: "tenant@example.com",
        subject: `We're on it - ${category}`,
        body: "Thanks for reporting this. We’ve logged your request and will arrange a vendor visit. Reply here if anything changes.",
      },
      {
        kind: "vendor_outreach",
        channel: "email",
        to: "vendor@example.com",
        subject: `Service Request (${priority})`,
        body: `${category} issue reported. Please confirm earliest availability for diagnosis/repair.`,
      },
    ],
    tokensUsed: { input: 0, output: 0 },
  };
}

// ---------- Normalize & post-process drafts ----------
type RawDraft = {
  kind: string;
  channel?: string;
  to?: string;
  subject?: string | null;
  body: string;
};

function normalizeDrafts(raw: any): { summary?: string; category?: string; priority?: string; drafts: RawDraft[] } {
  const drafts: RawDraft[] = Array.isArray(raw?.drafts) ? raw.drafts : [];
  const safeDrafts = drafts
    .filter((d) => d && (d.kind === "tenant_reply" || d.kind === "vendor_outreach"))
    .map((d) => ({
      kind: d.kind,
      channel: (d.channel || "email").toLowerCase(),
      to: d.to,
      subject: d.subject ?? null,
      body: String(d.body || "").trim(),
    }));

  const tenant = safeDrafts.find((d) => d.kind === "tenant_reply") || {
    kind: "tenant_reply",
    channel: "email",
    body: "We’ve logged your request and will update you shortly.",
    subject: "We’re on it",
  };
  tenant.channel = "email";
  tenant.to = TEST_TO_EMAIL;

  const vendor = safeDrafts.find((d) => d.kind === "vendor_outreach") || {
    kind: "vendor_outreach",
    channel: "email",
    body: "Please confirm availability for diagnosis/repair.",
    subject: "Service Request",
  };
  if (USE_SMS_FOR_VENDOR) {
    vendor.channel = "sms";
    vendor.to = DEMO_VENDOR_SMS;
    vendor.subject = null;
  } else {
    vendor.channel = "email";
    vendor.to = TEST_TO_EMAIL;
    vendor.subject = vendor.subject || "Service Request";
  }

  return {
    summary: typeof raw?.summary === "string" ? raw.summary : undefined,
    category: typeof raw?.category === "string" ? raw.category : undefined,
    priority: typeof raw?.priority === "string" ? raw.priority : undefined,
    drafts: [tenant, vendor],
  };
}

// ---------- Export: runAgentForRequest ----------
export async function runAgentForRequest(
  requestId: string,
  requestData?: { subject?: string | null; body?: string | null }
) {
  let result: any;
  let model = "mock";
  let tokensIn = 0;
  let tokensOut = 0;
  let status: "success" | "error" | "fallback" = "success";
  let errorMessage: string | null = null;

  try {
    if (USE_REAL_OPENAI) {
      console.log(`[Agent] Running agent for request ${requestId} using REAL OpenAI via Replit AI Integrations`);
      const raw = await callOpenAI({
        subject: requestData?.subject,
        body: requestData?.body,
        propertyInfo: `Request ID: ${requestId}`,
      });
      model = "openai-gpt-4.1-mini";
      tokensIn = raw.tokensUsed?.input || 0;
      tokensOut = raw.tokensUsed?.output || 0;
      result = normalizeDrafts(raw);
    } else {
      console.log(`[Agent] Running agent for request ${requestId} using MOCK LLM (set USE_REAL_OPENAI=true to use OpenAI)`);
      const raw = await callLLMMock({ subject: requestData?.subject, body: requestData?.body });
      model = "mock";
      result = normalizeDrafts(raw);
    }
  } catch (error: any) {
    console.error(`[Agent] Error processing request ${requestId}:`, error);
    console.log(`[Agent] Falling back to mock LLM due to error`);
    const raw = await callLLMMock({ subject: requestData?.subject, body: requestData?.body });
    model = "mock-fallback";
    status = "error";
    errorMessage = error?.message || "Unknown error";
    result = normalizeDrafts(raw);
  }

  // Record run
  addAgentRun({
    requestId,
    status: status === "fallback" ? "error" : status,
    model,
    tokensIn,
    tokensOut,
    error: errorMessage,
  });

  console.log(`[Agent] Generated ${result.drafts.length} drafts using ${model}`);
  if (result.category || result.priority) {
    console.log(`[Agent] Category: ${result.category || "n/a"}, Priority: ${result.priority || "n/a"}`);
  }
  if (tokensIn > 0) {
    console.log(`[Agent] Tokens used - Input: ${tokensIn}, Output: ${tokensOut}`);
  }

  // Persist drafts (in-memory)
  for (const d of result.drafts) {
    addAgentDraft({
      requestId,
      kind: d.kind as "tenant_reply" | "vendor_outreach",
      channel: d.channel as "email" | "sms",
      to: d.to!,
      subject: d.subject ?? null,
      body: d.body,
      vendorId: null,
      metadata: {
        summary: result.summary,
        category: result.category,
        priority: result.priority,
        model,
        generated_by: USE_REAL_OPENAI ? "OpenAI" : "Mock",
      },
    });
  }

  // ---- DB persist when USE_DB=true (so drafts survive restarts) ----
  if (String(process.env.USE_DB || "").toLowerCase() === "true") {
    const repo = await import("./db/repos.js");
    await repo.insertAgentDrafts(
      requestId,
      result.drafts.map((d: RawDraft) => ({
        requestId,
        kind: d.kind as "tenant_reply" | "vendor_outreach",
        channel: (d.channel || "email") as "email" | "sms",
        to: d.to || (d.kind === "tenant_reply" ? TEST_TO_EMAIL : (USE_SMS_FOR_VENDOR ? DEMO_VENDOR_SMS : TEST_TO_EMAIL)),
        subject: d.channel === "sms" ? null : (d.subject ?? null),
        body: d.body,
      }))
    );
  }

  return result;
}

// ---------- Inbound analysis helpers (unchanged) ----------
export type Inbound = { subject?: string | null; text?: string | null };

const COMPLETE_WORDS = ["done", "completed", "finished", "fixed", "resolved", "all set", "wrapped up"];
const PROGRESS_WORDS = ["started", "on site", "onsite", "in progress", "diagnosing", "picked up", "scheduled"];

function findRequestId(str: string): string | null {
  const m = str.match(/\[REQ:([A-Za-z0-9\-_]+)\]/i);
  return m?.[1] ?? null;
}
function containsAny(hay: string, needles: string[]) {
  return needles.some((w) => hay.includes(w));
}

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
