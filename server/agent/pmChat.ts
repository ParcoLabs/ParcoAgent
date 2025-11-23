// server/agent/pmChat.ts
// ChatGPT-style PM expert + action dispatcher for Parco PM Agent

/*
  What this does:
  - If the user's message is an ACTION (source quotes, schedule visit, create listing, draft notice),
    we call your own backend at /api/agent/run with the right payload and return a natural confirmation.
  - Otherwise, we route the chat to a dedicated LLM helper (pmChatLlm.js) with a strict
    PM-only system prompt, so it behaves like “ChatGPT for Property Management.”
  - If LLM is unavailable, we fall back gracefully with a visible reason so you can debug.
*/

export type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

export type PMContext = {
  propertyId?: string;
  propertyName?: string;
  unit?: string;
  requestId?: string | number;
  [k: string]: any;
};

// 👉 Use the dedicated chat helper, NOT the email composer
import { pmChatAnswer } from "../services/pmChatLlm.js";

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

type Mode =
  | "source-quotes"
  | "schedule_visit"
  | "create_listing"
  | "draft_notice";

type RunResponse = {
  ok?: boolean;
  message?: string;
  data?: any;
  error?: string;
};

const API_BASE =
  (process.env.API_BASE_URL || "").replace(/\/$/, "") ||
  (process.env.VITE_API_BASE_URL || "").replace(/\/$/, "") ||
  "http://localhost:5000/api";

const PM_SYSTEM_PROMPT = `
You are Parco’s Property Management Expert Agent embedded in an operations dashboard.
Stay STRICTLY within real estate and property management (residential or light commercial):
maintenance and diagnostics, vendors & procurement, quotes/bids, job scheduling,
tenant communications/notices & compliance, leasing & listing creation, pricing/NOI/ROI,
SLA tracking, inspections, turns/make-ready, CapEx/OpEx basics, safety protocols,
legal/compliance considerations, and ops guardrails.

You can reason about:
- maintenance triage and likely causes,
- when to dispatch a vendor vs give self-help steps,
- basic building systems (boilers, HVAC, plumbing, electrical) at a non-engineer level,
- risk, liability, and when to escalate to legal/compliance,
- listing strategy, rent comps, and NOI impact.

You MUST stay inside property management / real estate and adjacent compliance topics.
If asked about unrelated topics, briefly decline and steer back.

Style: clear, concise, decisive, professional. Avoid fluff. Use numbered/bulleted steps
when helpful. If asked to DO something (source 3 quotes, schedule a visit, draft notice,
create listing), think it through and, when appropriate, call the relevant Parco backend
action instead of only explaining.
`;

/* -------------------------------------------------------------------------- */
/* Utility helpers                                                            */
/* -------------------------------------------------------------------------- */

type Intent =
  | "LISTING"
  | "SOURCE_QUOTES"
  | "SCHEDULE_VISIT"
  | "DRAFT_NOTICE"
  | "GENERAL_PM_QA"
  | "OUT_OF_SCOPE";

function isInDomain(t: string): boolean {
  // Loosened so “fix the sink / boiler / leak” etc is clearly PM
  return /rent|lease|tenant|landlord|property|unit|apartment|building|hoa|maintenance|repair|fix|leak|sink|toilet|drain|boiler|heater|hvac|vendor|quote|bid|listing|notice|eviction|lease\s*renewal|inspection|turnover|make[- ]ready|noi|roi|capex|opex|hoa\s*fees|rent\s*roll|safety|violation|code\s*compliance/i.test(
    t
  );
}

function classifyIntent(s: string): Intent {
  const t = s.toLowerCase();

  if (!isInDomain(t)) return "OUT_OF_SCOPE";

  if (/\b(list(ing)?|publish|post.*rent|market.*unit|ad copy|ad\s+text)\b/.test(t)) {
    return "LISTING";
  }
  if (/\b(source|get|collect).*(3|three).*(quote|bid)|vendor.*quote|three.*quotes|3.*quotes?\b/.test(t)) {
    return "SOURCE_QUOTES";
  }
  if (/schedule.*visit|book.*visit|confirm.*visit|availability|window|time\s*slot|access\s*window/i.test(t)) {
    return "SCHEDULE_VISIT";
  }
  if (/notice|draft.*(email|sms|text)|compose|late\s*rent|access\s*notice|violation|legal/i.test(t)) {
    return "DRAFT_NOTICE";
  }

  return "GENERAL_PM_QA";
}

function extractRequestId(text: string, ctx?: PMContext): string | null {
  const m =
    text.match(/\bREQ[-_ ]?(\d{2,6})\b/i) ||
    text.match(/\brequest[-_ ]?(\d{2,6})\b/i) ||
    text.match(/\bjob[-_ ]?(\d{2,6})\b/i);
  if (m) {
    const id = m[1] || m[0];
    return String(id).toUpperCase().replace(/\s+/g, "");
  }
  if (ctx?.requestId != null) {
    return String(ctx.requestId).toUpperCase();
  }
  return null;
}

// Very lightweight natural-language window parser (we just send text to backend)
function extractVisitWindow(text: string): string | null {
  const m = text.match(
    /(today|tomorrow|mon|tue|wed|thu|thur|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[^.,\n]*/i
  );
  return m ? m[0].trim() : null;
}

function extractListingMeta(text: string, ctx?: PMContext) {
  const bedsMatch = text.match(/(\d+(?:\.\d+)?)\s*(bed|br|bd|bedroom)s?/i);
  const bathsMatch = text.match(/(\d+(?:\.\d+)?)\s*(bath|ba|bathroom)s?/i);
  const sqftMatch = text.match(/(\d{3,5})\s*(sq\s*ft|sqft|sf)\b/i);
  const rentMatch = text.match(/\$(\d{3,6})/);

  const beds = bedsMatch ? Number(bedsMatch[1]) : undefined;
  const baths = bathsMatch ? Number(bathsMatch[1]) : undefined;
  const sqft = sqftMatch ? Number(sqftMatch[1]) : undefined;
  const rent = rentMatch ? Number(rentMatch[1]) : undefined;

  const unitMatch = text.match(/unit\s+([\w-]+)/i);
  const unit = unitMatch ? unitMatch[1] : ctx?.unit;

  return { beds, baths, sqft, rent, unit };
}

/* -------------------------------------------------------------------------- */
/* Backend action bridge                                                      */
/* -------------------------------------------------------------------------- */

async function runAction(mode: Mode, payload: any): Promise<RunResponse> {
  try {
    const res = await fetch(`${API_BASE}/agent/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, ...payload }),
    });
    const data: any = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || data?.message || `HTTP ${res.status}`,
        data,
      };
    }
    return { ok: true, message: data?.message, data };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/* -------------------------------------------------------------------------- */
/* LLM helper                                                                 */
/* -------------------------------------------------------------------------- */

async function llmAnswer(messages: ChatTurn[]): Promise<string> {
  const llmMsgs = messages.map((m) => ({
    role: m.role,
    content: String(m.content || ""),
  }));

  try {
    const reply = await pmChatAnswer({
      system: PM_SYSTEM_PROMPT,
      messages: llmMsgs,
      temperature: 0.2,
    });

    if (!reply || !String(reply).trim()) {
      throw new Error("Empty LLM reply");
    }

    return String(reply);
  } catch (err: any) {
    const reason = err?.message || String(err);
    console.error("[pmChat] llmAnswer error:", reason);

    // Visible reason for easier debugging in the UI
    return [
      "I couldn’t complete that because the model call failed.",
      `Reason: ${reason}`,
      "",
      "Try again, or ask me to do one of these:",
      "• “source 3 quotes for REQ-1001”",
      "• “schedule a visit Friday 2–4pm for REQ-1002”",
      "• “create a listing — 2BR/1BA, 780 sqft”",
      "• “what’s a quick way to improve NOI on 225 Pine?”",
    ].join("\n");
  }
}

/* -------------------------------------------------------------------------- */
/* Main dispatcher                                                            */
/* -------------------------------------------------------------------------- */

export async function pmChatRespond(
  messages: ChatTurn[],
  context: PMContext = {},
  mode: "ask" | "act" | "insight" = "ask"
): Promise<{ message: string }> {
  const lastUser =
    [...messages].reverse().find((m) => m.role === "user") || messages[messages.length - 1];

  const text = (lastUser?.content || "").trim();
  if (!text) {
    return {
      message:
        "Hi! I’m your property management assistant. Ask about maintenance, vendors, notices, listings, or NOI and I’ll help.",
    };
  }

  const intent = classifyIntent(text);

  // OUT_OF_SCOPE → still call LLM but it will politely steer back to PM topics
  if (intent === "OUT_OF_SCOPE") {
    const reply = await llmAnswer(messages);
    return { message: reply };
  }

  // ACTIONFUL INTENTS → call your backend
  if (intent === "SOURCE_QUOTES") {
    const reqId = extractRequestId(text, context);
    if (!reqId) {
      return {
        message:
          "To source quotes I need a **request ID** (e.g. REQ-1001) or a quick issue summary + category (plumbing/HVAC/etc.).",
      };
    }
    const result = await runAction("source-quotes", { requestId: reqId });
    if (result.ok) {
      return {
        message:
          result.message ||
          `On it — I’m sourcing **3 vendor quotes** for **${reqId}**. Check the **Vendors → Prospects** section for details.`,
      };
    }
    return {
      message: `I tried to source quotes for **${reqId}** but got an error: ${
        result.error || "unknown error"
      }.`,
    };
  }

  if (intent === "SCHEDULE_VISIT") {
    const reqId = extractRequestId(text, context);
    const window = extractVisitWindow(text);
    if (!reqId) {
      return {
        message:
          "To schedule a visit I need a **request ID** (e.g. REQ-1002). You can also include a time window like “Friday 2–4pm”.",
      };
    }
    const payload: any = {
      requestId: reqId,
      window,
      commit: mode === "act",
    };
    const result = await runAction("schedule_visit", payload);
    if (result.ok) {
      return {
        message:
          result.message ||
          `Got it — I’ll schedule a **vendor visit** for **${reqId}**${
            window ? ` around **${window}**` : ""
          } and update the tenant.`,
      };
    }
    return {
      message: `I tried to schedule a visit for **${reqId}** but got an error: ${
        result.error || "unknown error"
      }.`,
    };
  }

  if (intent === "LISTING") {
    const { beds, baths, sqft, rent, unit } = extractListingMeta(text, context);
    const payload: any = {
      propertyId: context.propertyId,
      propertyName: context.propertyName,
      unit,
      beds,
      baths,
      sqft,
      rent,
      commit: mode === "act",
    };

    if (!payload.propertyId && !payload.propertyName) {
      return {
        message:
          "Which **property or unit** is this for? Include **beds/baths/sqft** and target **rent** if you can.",
      };
    }

    const result = await runAction("create_listing", payload as any);
    if (result.ok) {
      return {
        message:
          result.message ||
          `Drafted a **rental listing** for ${
            payload.propertyName || `unit ${payload.unit}`
          }. You can review/edit the copy before publishing.`,
      };
    }
    return {
      message: `I tried to create a listing but got an error: ${
        result.error || "unknown error"
      }.`,
    };
  }

  if (intent === "DRAFT_NOTICE") {
    const reqId = extractRequestId(text, context);
    const payload: any = {
      requestId: reqId,
      propertyId: context.propertyId,
      propertyName: context.propertyName,
      unit: context.unit,
      rawText: text,
      commit: mode === "act",
    };

    const result = await runAction("draft_notice", payload);
    if (result.ok) {
      return {
        message:
          result.message ||
          `Drafted a **notice** based on your message. Check **Drafts** to review and send it.`,
      };
    }
    return {
      message: `I tried to draft a notice but got an error: ${
        result.error || "unknown error"
      }.`,
    };
  }

  // Otherwise: GENERAL PM QA → talk like ChatGPT but PM-only
  const reply = await llmAnswer(messages);
  return { message: reply };
}
