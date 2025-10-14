// server/agent.ts
import { addAgentDraft, addAgentRun } from "./storage.js";
import { nanoid } from "nanoid";
import OpenAI from "openai";

// -------------------------------------------
// ID helper
// -------------------------------------------
const genId = () => nanoid(21);

// -------------------------------------------
// OpenAI Configuration using Replit AI Integrations
// -------------------------------------------
const USE_REAL_OPENAI = process.env.USE_REAL_OPENAI === "true";

// Initialize OpenAI client with Replit AI Integrations endpoint
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "dummy-key",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
});

// -------------------------------------------
// OpenAI-powered LLM function
// -------------------------------------------
async function callOpenAI(input: { subject?: string | null; body?: string | null; propertyInfo?: string }) {
  const requestText = `${input.subject || ""} ${input.body || ""}`;
  const propertyInfo = input.propertyInfo || "Property details not available";
  
  const systemPrompt = `You are a helpful property management assistant. Analyze the maintenance request and generate appropriate responses.
  
  Return your response as a JSON object with this structure:
  {
    "summary": "Brief summary of the issue",
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
        "body": "Email body - be clear about the issue and request availability"
      }
    ]
  }`;

  const userPrompt = `Maintenance Request:
Subject: ${input.subject || "No subject"}
Body: ${input.body || "No body"}
Property Info: ${propertyInfo}

Please analyze this request and generate appropriate draft responses.`;

  try {
    console.log("[OpenAI] Calling real OpenAI API via Replit AI Integrations...");
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini", // Using a model supported by Replit AI Integrations
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(response);
    console.log("[OpenAI] Successfully generated response using real OpenAI");
    
    // Return the tokens used for logging
    return {
      ...result,
      tokensUsed: {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
      }
    };
  } catch (error) {
    console.error("[OpenAI] Error calling OpenAI:", error);
    throw error;
  }
}

// -------------------------------------------
// Mock LLM (fallback)
// -------------------------------------------
async function callLLMMock(input: { subject?: string | null; body?: string | null }) {
  console.log("[Mock] Using mock LLM response generator");
  
  const text = `${input.subject || ""} ${input.body || ""}`.toLowerCase();
  const isPlumbing = text.includes("leak") || text.includes("faucet") || text.includes("water");
  const isHVAC = text.includes("ac") || text.includes("heating") || text.includes("air") || text.includes("temperature");
  const isElectrical = text.includes("outlet") || text.includes("switch") || text.includes("light") || text.includes("power");
  
  let category = "other";
  let priority = "low";
  let summary = "New maintenance request received.";
  
  if (isPlumbing) {
    category = "plumbing";
    priority = text.includes("flood") || text.includes("burst") ? "urgent" : "normal";
    summary = "Tenant reports a plumbing issue.";
  } else if (isHVAC) {
    category = "hvac";
    priority = text.includes("no heat") || text.includes("no cooling") ? "high" : "normal";
    summary = "Tenant reports HVAC issue.";
  } else if (isElectrical) {
    category = "electrical";
    priority = text.includes("sparks") || text.includes("burning") ? "urgent" : "normal";
    summary = "Tenant reports electrical issue.";
  }

  return {
    summary,
    category,
    priority,
    drafts: [
      {
        kind: "tenant_reply",
        channel: "email",
        to: "tenant@example.com",
        subject: "We're on it - " + category.charAt(0).toUpperCase() + category.slice(1) + " Issue",
        body:
          "Thanks for reporting this " + category + " issue. We've logged your request and will arrange for a qualified vendor to address it. We'll follow up with you on timing. Please reply here if anything changes or if the situation becomes more urgent.",
      },
      {
        kind: "vendor_outreach",
        channel: "email",
        to: category + "_vendor@example.com",
        subject: "Service Request - " + priority.charAt(0).toUpperCase() + priority.slice(1) + " Priority",
        body:
          category.charAt(0).toUpperCase() + category.slice(1) + " issue reported at Unit 3B. Priority: " + priority + ". Please confirm availability for inspection and repair. Reply to confirm your earliest available time slot.",
      },
    ],
    tokensUsed: {
      input: 0,
      output: 0,
    }
  };
}

// -------------------------------------------
// Exported: runAgentForRequest (simplified for in-memory storage)
// -------------------------------------------
export async function runAgentForRequest(requestId: string, requestData?: { subject?: string | null; body?: string | null }) {
  let result;
  let model = "mock";
  let tokensIn = 0;
  let tokensOut = 0;
  let status: "success" | "error" | "fallback" = "success";
  let errorMessage: string | null = null;

  try {
    // Log which method we're using
    if (USE_REAL_OPENAI) {
      console.log(`[Agent] Running agent for request ${requestId} using REAL OpenAI via Replit AI Integrations`);
      result = await callOpenAI({ 
        subject: requestData?.subject, 
        body: requestData?.body,
        propertyInfo: `Request ID: ${requestId}` 
      });
      model = "openai-gpt-4.1-mini";
      tokensIn = result.tokensUsed?.input || 0;
      tokensOut = result.tokensUsed?.output || 0;
    } else {
      console.log(`[Agent] Running agent for request ${requestId} using MOCK LLM (set USE_REAL_OPENAI=true to use OpenAI)`);
      result = await callLLMMock({ subject: requestData?.subject, body: requestData?.body });
      model = "mock";
    }
  } catch (error: any) {
    console.error(`[Agent] Error processing request ${requestId}:`, error);
    
    // Fallback to mock if OpenAI fails
    console.log(`[Agent] Falling back to mock LLM due to error`);
    result = await callLLMMock({ subject: requestData?.subject, body: requestData?.body });
    model = "mock-fallback";
    status = "error";
    errorMessage = error.message || "Unknown error";
  }

  // Record agent run with detailed information
  addAgentRun({
    requestId,
    status: status === "fallback" ? "error" : status,
    model,
    tokensIn,
    tokensOut,
    error: errorMessage,
  });

  // Log the result
  console.log(`[Agent] Generated ${result.drafts.length} drafts using ${model}`);
  console.log(`[Agent] Category: ${result.category}, Priority: ${result.priority}`);
  if (tokensIn > 0) {
    console.log(`[Agent] Tokens used - Input: ${tokensIn}, Output: ${tokensOut}`);
  }

  // Store the drafts
  for (const d of result.drafts) {
    addAgentDraft({
      requestId,
      kind: d.kind as "tenant_reply" | "vendor_outreach",
      channel: d.channel as "email" | "sms",
      to: d.to,
      subject: d.subject || null,
      body: d.body,
      vendorId: null,
      metadata: {
        summary: result.summary,
        category: result.category,
        priority: result.priority,
        model: model,
        generated_by: USE_REAL_OPENAI ? "OpenAI" : "Mock",
      },
    });
  }
  
  return result;
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