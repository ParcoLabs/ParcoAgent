// server/services/pmChatLlm.js
// Dedicated LLM helper for the Agent Console chat (property-management only)

import "dotenv/config";
import OpenAI from "openai";

/* -------------------------------------------------------------------------- */
/* Config (supports both user keys `sk-...` and project keys `sk-proj-...`)   */
/* -------------------------------------------------------------------------- */

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const OPENAI_MODEL = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();

// Optional: only needed if you're using org/project scoping or a proxy
const OPENAI_ORG_ID = (process.env.OPENAI_ORG_ID || "").trim();
const OPENAI_PROJECT = (process.env.OPENAI_PROJECT || "").trim();
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "").trim(); // usually leave blank

// Build client with optional baseURL/org/project so `sk-proj-...` works
const client = new OpenAI({
  apiKey: OPENAI_API_KEY,
  ...(OPENAI_ORG_ID ? { organization: OPENAI_ORG_ID } : {}),
  ...(OPENAI_PROJECT ? { project: OPENAI_PROJECT } : {}),
  ...(OPENAI_BASE_URL ? { baseURL: OPENAI_BASE_URL } : {}),
});

/* -------------------------------------------------------------------------- */
/* Public helper                                                              */
/* -------------------------------------------------------------------------- */

export async function pmChatAnswer(opts) {
  const { system, messages, temperature = 0.2 } = opts;

  const safeMessages = [
    { role: "system", content: String(system || "") },
    ...[].concat(messages || []).map((m) => ({
      role: m?.role === "assistant" || m?.role === "system" ? m.role : "user",
      content: String(m?.content ?? "").slice(0, 8000),
    })),
  ];

  if (!OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  try {
    const resp = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature,
      messages: safeMessages,
    });

    const out = String(resp?.choices?.[0]?.message?.content || "").trim();
    if (!out) throw new Error("Empty chat completion");
    return out;
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("[pmChatLlm] error:", msg);
    throw err;
  }
}
