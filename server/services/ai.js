// server/services/ai.js
// ESM module. Requires: npm i openai
import OpenAI from "openai";

const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
export const isAiReady = typeof OPENAI_KEY === "string" && OPENAI_KEY.trim().length > 0;

let client = null;
if (isAiReady) {
  client = new OpenAI({ apiKey: OPENAI_KEY });
}

/**
 * Safe JSON parse for LLM outputs that should be JSON.
 */
function safeJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * Low-level helper to get a JSON response from the model
 */
async function chatJson({ system, user, model = "gpt-4o-mini", temperature = 0.2 }) {
  if (!client) throw new Error("OPENAI_API_KEY missing");
  const resp = await client.chat.completions.create({
    model,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text = resp.choices?.[0]?.message?.content || "{}";
  return safeJson(text, {});
}

/**
 * Compose a single message (subject + body) for a tenant or vendor.
 * Returns { subject, body }
 */
export async function composeOne({ target, request, tone = "neutral" }) {
  if (!isAiReady) {
    // fallback mock (keeps the UI working)
    return {
      subject:
        target === "tenant"
          ? `Update on your ${request.category || "maintenance"} request`
          : `Service request at ${request.property || "the property"}`,
      body:
        target === "tenant"
          ? `Thanks for your report about "${request.summary}". We’re coordinating a visit. Priority: ${request.priority || "Normal"}.`
          : `Please confirm availability to handle "${request.summary}" at ${request.property || "the property"}.`,
    };
  }

  const system = `
You are an assistant for a property management company. 
Write clear, concise emails/SMS copy with correct tone and next steps.
Return strict JSON: {"subject": string, "body": string}.
No markdown, no extra keys.`;

  const user = `
Target: ${target}
Tone: ${tone}
Request:
- id: ${request.id}
- summary: ${request.summary}
- category: ${request.category || "n/a"}
- priority: ${request.priority || "n/a"}
- property: ${request.property || "n/a"}`;

  const json = await chatJson({ system, user });
  const subject = typeof json.subject === "string" ? json.subject : "Update";
  const body = typeof json.body === "string" ? json.body : "Here is an update on your request.";

  return { subject, body };
}

/**
 * Generate one or two drafts for a request depending on mode.
 * Returns an array of { kind, channel, to, subject, body, vendorId?, metadata? }
 */
export async function generateMessageDrafts({
  request,
  mode = "both",
  toneTenant = "neutral",
  toneVendor = "neutral",
}) {
  // In your mock data we don’t have real emails/phones. Use a test email.
  const TEST_EMAIL = "yessociety@gmail.com";

  const drafts = [];

  const baseMeta = {
    summary: request.summary || request.title || "Maintenance request",
    category: request.category || "Other",
    priority: request.priority || "Medium",
    property: request.property || request.propertyId || "Unknown",
  };

  const wantTenant = !mode || mode === "tenant_update" || mode === "both";
  const wantVendor = !mode || mode === "vendor_outreach" || mode === "both";

  if (!isAiReady) {
    // Fallback to deterministic mock so UI works without key
    if (wantTenant) {
      drafts.push({
        kind: "tenant_reply",
        channel: "email",
        to: TEST_EMAIL,
        subject: `We’re on it: ${baseMeta.category}`,
        body:
          "Thanks for reporting this. We’ve logged your request and will arrange a vendor visit. Reply here if anything changes.",
        vendorId: null,
        metadata: baseMeta,
      });
    }
    if (wantVendor) {
      drafts.push({
        kind: "vendor_outreach",
        channel: "email",
        to: TEST_EMAIL,
        subject: `Service request at ${baseMeta.property}`,
        body:
          "Please confirm availability tomorrow 10–12 for diagnosis/repair. Reply to confirm and include any materials/ETA.",
        vendorId: undefined,
        metadata: baseMeta,
      });
    }
    return drafts;
  }

  // With GPT
  if (wantTenant) {
    const t = await composeOne({
      target: "tenant",
      tone: toneTenant,
      request: {
        id: request.id,
        summary: baseMeta.summary,
        category: baseMeta.category,
        priority: baseMeta.priority,
        property: baseMeta.property,
      },
    });
    drafts.push({
      kind: "tenant_reply",
      channel: "email",
      to: TEST_EMAIL,
      subject: t.subject,
      body: t.body,
      vendorId: null,
      metadata: baseMeta,
    });
  }

  if (wantVendor) {
    const v = await composeOne({
      target: "vendor",
      tone: toneVendor,
      request: {
        id: request.id,
        summary: baseMeta.summary,
        category: baseMeta.category,
        priority: baseMeta.priority,
        property: baseMeta.property,
      },
    });
    drafts.push({
      kind: "vendor_outreach",
      channel: "email",
      to: TEST_EMAIL,
      subject: v.subject,
      body: v.body,
      vendorId: undefined,
      metadata: baseMeta,
    });
  }

  return drafts;
}
