// server/services/sms.ts
import twilio from "twilio";

const sid = process.env.TWILIO_ACCOUNT_SID;
const auth = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_NUMBER;

let client: twilio.Twilio | null = null;
if (sid && auth) {
  client = twilio(sid, auth);
}

export async function sendSMS(to: string, body: string) {
  if (!client || !from) {
    console.warn("[sms] Missing Twilio config; skipping send");
    return { ok: false, skipped: true };
  }
  await client.messages.create({ from, to, body });
  return { ok: true };
}
