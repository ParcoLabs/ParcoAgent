// server/services/llm.js
// Robust LLM wrapper for Parco PM Agent (text + image). ESM module.

import "dotenv/config";

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

const USE_REAL_OPENAI = String(process.env.USE_REAL_OPENAI || "true")
  .toLowerCase()
  === "true";

const OPENAI_BASE_URL =
  (process.env.OPENAI_BASE_URL || "").replace(/\/$/, "") ||
  (USE_REAL_OPENAI ? "https://api.openai.com/v1" : "http://localhost:1106/modelfarm/openai");

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY_BETA ||
  ""; // must be set if USE_REAL_OPENAI=true

const OPENAI_MODEL = process.env.OPENAI_MODEL || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

const PM_SYSTEM_PROMPT = `
You are **Parco PM — Property Management Expert Agent** inside an operations dashboard.
Stay STRICTLY within real estate / property management topics:
maintenance and diagnostics, vendors & procurement, quotes/bids, job scheduling,
tenant communications/notices & compliance, leasing & listing creation, pricing/NOI/ROI,
SLA tracking, inspections, turns/make-ready, CapEx/OpEx basics, safety protocols.

Style: concise, decisive, checklists when useful. If asked to DO something (source 3 quotes,
schedule a visit, draft a notice, create a listing), explain exactly what info you need and
what action will run. Do NOT claim you executed an action—backend routes perform actions.
If the user goes off-topic, politely redirect back to PM.
`.trim();

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function authHeader() {
  if (!USE_REAL_OPENAI) return {};
  return { Authorization: `Bearer ${OPENAI_API_KEY}` };
}

/** Normalize to OpenAI "content" array so vision works. */
function normalizeMessages({ system, messages }) {
  const out = [];
  if (system) {
    out.push({ role: "system", content: [{ type: "text", text: system }] });
  }
  for (const m of messages || []) {
    if (typeof m?.content === "string") {
      out.push({ role: m.role, content: [{ type: "text", text: m.content }] });
    } else if (Array.isArray(m?.content)) {
      // Assume already in parts format: [{type:"text"| "image_url", ...}]
      out.push({ role: m.role, content: m.content });
    } else {
      out.push({ role: m.role, content: [{ type: "text", text: String(m?.content || "") }] });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Core call                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Flexible signature to avoid breaking callers:
 *  A) composeMessage({ system, messages, temperature? })
 *  B) composeMessage(messages, context?, mode?)  // legacy
 *
 * Messages may contain:
 *  - { role, content: "text" }
 *  - { role, content: [{ type:"text", text }, { type:"image_url", image_url:{ url } }, ...] }
 */
export async function composeMessage(arg1, context = {}, mode = "ask") {
  // Support legacy signature
  const isLegacy = Array.isArray(arg1);
  const system = isLegacy ? PM_SYSTEM_PROMPT : (arg1.system || PM_SYSTEM_PROMPT);
  const messages = isLegacy ? arg1 : arg1.messages || [];
  const temperature = isLegacy ? 0.2 : (arg1.temperature ?? 0.2);

  // Append context/mode as a trailing system note (non-vision)
  const ctxNote = {
    role: "system",
    content: [{ type: "text", text: `Context JSON: ${safeJson(context)}\nMode: ${mode}` }],
  };

  const payload = {
    model: OPENAI_MODEL,
    messages: normalizeMessages({ system, messages }).concat(ctxNote),
    temperature,
  };

  try {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LLM HTTP ${res.status}: ${text || res.statusText}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    return { content };
  } catch (err) {
    // Bubble the error so caller can detect and show a clear message/fallback
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Simple helper if you want to pass one image URL + a prompt.
 * Returns { content }
 */
export async function visionExplain({ prompt, imageUrl, temperature = 0.2 }) {
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: prompt || "Analyze this image from a property maintenance perspective." },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ];
  return composeMessage({ system: "You are a property maintenance expert.", messages, temperature });
}

/* -------------------------------------------------------------------------- */
/* Utils                                                                      */
/* -------------------------------------------------------------------------- */

function safeJson(obj) {
  try {
    const s = JSON.stringify(obj ?? {});
    return s.length > 4000 ? s.slice(0, 4000) + " …truncated" : s;
  } catch {
    return "{}";
  }
}
