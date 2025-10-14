// server/services/llm.ts
// ESM TypeScript. Uses global fetch (Node 18+).
// Uses OPENAI_BASE_URL when present (Replit ModelFarm proxy), else public API.
// Logs path taken; falls back safely to mock on error.

type ComposeTarget = "tenant" | "vendor";
type ComposeTone = "neutral" | "friendly" | "firm";

export type ComposeInput = {
  target: ComposeTarget;
  request: {
    id: string;
    summary: string;
    category?: string;
    priority?: string;
    property?: string;
  };
  tone?: ComposeTone;
};

export async function composeMessage(
  input: ComposeInput
): Promise<{ subject: string; body: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const base = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com").replace(/\/+$/,"");

  if (!apiKey) {
    console.info("[llm] OPENAI_API_KEY missing — using MOCK drafts");
    return mockCompose(input);
  }

  const prompt = buildPrompt(input);

  try {
    // Prefer Responses API
    const url = `${base}/v1/responses`;
    console.info(`[llm] using OpenAI model=${model} via ${url}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
        temperature: 0.4,
        max_output_tokens: 600,
        text: { format: { type: "text" } },
      }),
    });

    if (!res.ok) {
      const text = await safeText(res);
      console.warn("[llm] responses API error:", res.status, res.statusText, text);
      return await tryChatCompletions(prompt, apiKey, model, base, input);
    }

    const data = await safeJson(res);
    const raw =
      (typeof data?.output_text === "string" && data.output_text) ||
      (Array.isArray(data?.output) && data.output[0]?.content?.[0]?.text) ||
      "";

    if (!raw) {
      console.warn("[llm] responses API empty output — trying chat.completions");
      return await tryChatCompletions(prompt, apiKey, model, base, input);
    }

    const { subject, body } = splitSubjectBody(raw);
    return { subject, body };
  } catch (err: any) {
    console.error("[llm] unexpected error — using MOCK drafts:", err?.message || err);
    return mockCompose(input);
  }
}

async function tryChatCompletions(
  prompt: string,
  apiKey: string,
  model: string,
  base: string,
  input: ComposeInput
) {
  try {
    const url = `${base}/v1/chat/completions`;
    console.info(`[llm] fallback: using ${url} model=${model}`);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      const text = await safeText(res);
      console.warn("[llm] chat.completions error:", res.status, res.statusText, text);
      return mockCompose(input);
    }

    const data = await safeJson(res);
    const raw = data?.choices?.[0]?.message?.content?.toString() ?? "";
    if (!raw) {
      console.warn("[llm] chat.completions empty output — using MOCK");
      return mockCompose(input);
    }

    const { subject, body } = splitSubjectBody(raw);
    return { subject, body };
  } catch (err: any) {
    console.error("[llm] chat.completions exception — using MOCK:", err?.message || err);
    return mockCompose(input);
  }
}

/* -------------------------------- internals ------------------------------- */

function buildPrompt(input: ComposeInput): string {
  const { target, request, tone = "neutral" } = input;

  const voice =
    tone === "friendly" ? "Be warm and reassuring."
    : tone === "firm" ? "Be concise and confident, but courteous."
    : "Be clear and neutral.";

  const who =
    target === "tenant"
      ? "Write an email to the TENANT with a quick status update."
      : "Write an email to the VENDOR to coordinate service and next steps.";

  return [
    `${who} ${voice}`,
    `PROPERTY: ${request.property ?? "N/A"}`,
    `CATEGORY: ${request.category ?? "General"}`,
    `PRIORITY: ${request.priority ?? "Normal"}`,
    `REQUEST SUMMARY: ${request.summary}`,
    "",
    "Strict format:",
    "Subject: <short subject line>",
    "",
    "Body:",
    "<email body, plain text, short paragraphs, no markdown>",
  ].join("\n");
}

function splitSubjectBody(raw: string): { subject: string; body: string } {
  const subjectMatch = raw.match(/Subject:\s*(.+)/i);
  const bodyIndex = raw.search(/\bBody:\b/i);

  const subject = subjectMatch?.[1]?.trim() || "Update on your request";
  const body =
    bodyIndex >= 0
      ? raw.slice(bodyIndex + "Body:".length).trim()
      : raw.replace(/^Subject:.*$/im, "").trim();

  return {
    subject: truncate(subject, 140),
    body:
      body ||
      "Hello,\n\nFollowing up regarding your request. We'll keep you posted.\n\nThanks,\nProperty Management",
  };
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function mockCompose(input: ComposeInput): { subject: string; body: string } {
  const { target, request } = input;
  if (target === "vendor") {
    return {
      subject: `Service needed: ${request.category ?? "General"} at ${request.property ?? "property"}`,
      body: `Hi,\n\nPlease service the following request (ID ${request.id}):\n\n${request.summary}\n\nLet us know your ETA and any parts needed.\n\nThanks,\nParco PM`,
    };
  }
  return {
    subject: `We're on it: ${request.category ?? "General"}`,
    body:
      "Thanks for reporting this. We’ve logged your request and will arrange a vendor visit. Reply here if anything changes.",
  };
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
