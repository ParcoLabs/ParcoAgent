import postmark from "postmark";

const token = process.env.POSTMARK_SERVER_TOKEN;
const from = process.env.POSTMARK_FROM;

let client: postmark.ServerClient | null = null;
if (token) client = new postmark.ServerClient(token);

export async function sendEmail(to: string, subject: string, text: string) {
  if (!client || !from) {
    console.warn("[email] Missing Postmark config; skipping send", { hasToken: !!token, from });
    // Throw so the UI shows a clear error instead of silently 'sent'
    throw new Error("Postmark not configured: set POSTMARK_SERVER_TOKEN and POSTMARK_FROM");
  }
  try {
    const resp = await client.sendEmail({ From: from, To: to, Subject: subject, TextBody: text });
    console.log("[email] sent", { to, messageId: resp.MessageID });
    return { ok: true };
  } catch (err: any) {
    // Postmark gives status/message details here
    console.error("[email] Postmark error", {
      code: err?.code,
      status: err?.statusCode,
      message: err?.message,
      data: err,
    });
    throw err;
  }
}
