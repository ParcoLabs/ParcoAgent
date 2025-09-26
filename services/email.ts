// server/services/email.ts
import postmark from "postmark";

const token = process.env.POSTMARK_SERVER_TOKEN;
const from = process.env.POSTMARK_FROM;

let client: postmark.ServerClient | null = null;
if (token) {
  client = new postmark.ServerClient(token);
}

export async function sendEmail(to: string, subject: string, text: string) {
  if (!client || !from) {
    console.warn("[email] Missing Postmark config; skipping send");
    return { ok: false, skipped: true };
  }
  await client.sendEmail({ From: from, To: to, Subject: subject, TextBody: text });
  return { ok: true };
}
