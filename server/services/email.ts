// server/services/email.ts
// Postmark email sender with graceful fallback.
// Uses: POSTMARK_SERVER_TOKEN, POSTMARK_FROM, POSTMARK_TEST_MODE, POSTMARK_TEST_TO

type SendResult =
  | { ok: true; id: string; to: string }
  | { skipped: true; reason: string };

const PM_TOKEN = process.env.POSTMARK_SERVER_TOKEN?.trim();
const PM_FROM = process.env.POSTMARK_FROM?.trim();
const PM_TEST_MODE = String(process.env.POSTMARK_TEST_MODE || "").toLowerCase() === "true";
const PM_TEST_TO = process.env.POSTMARK_TEST_TO?.trim();

export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<SendResult> {
  // Missing config? Do not crash — just skip.
  if (!PM_TOKEN || !PM_FROM) {
    return { skipped: true, reason: "missing_postmark_config" };
  }

  // Test mode: redirect to test inbox to avoid spamming real recipients
  let finalTo = to;
  let finalSubject = subject;
  let finalBody = body;

  if (PM_TEST_MODE) {
    finalTo = PM_TEST_TO || "ops@example.com";
    finalSubject = `[TEST] ${subject}`;
    finalBody =
      `TEST MODE: original To=${to}\n\n` +
      body;
  }

  try {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "X-Postmark-Server-Token": PM_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        From: PM_FROM,
        To: finalTo,
        Subject: finalSubject,
        TextBody: finalBody,
        MessageStream: "outbound",
      }),
    });

    const json = await safeJson(res);

    if (!res.ok) {
      console.warn("[email] Postmark error:", res.status, res.statusText, json);
      return { skipped: true, reason: `postmark_${res.status}` };
    }

    const messageId = json?.MessageID || json?.MessageId || json?.MessageID?.toString?.() || "unknown";
    console.log("[email] sent", { to: finalTo, id: messageId, test: PM_TEST_MODE });
    return { ok: true, id: String(messageId), to: finalTo };
  } catch (err: any) {
    console.error("[email] exception:", err?.message || err);
    return { skipped: true, reason: "postmark_exception" };
  }
}

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}
