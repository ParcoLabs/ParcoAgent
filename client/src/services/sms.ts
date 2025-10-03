// server/services/sms.ts
import twilio from "twilio";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_NUMBER,
} = process.env;

function missingEnv() {
  return !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_NUMBER;
}

/**
 * Send an SMS using Twilio.
 * Returns:
 *  - { ok: true, sid } on success
 *  - { skipped: true, reason } if Twilio creds are missing
 *  - throws on Twilio API error
 */
export async function sendSMS(to: string, body: string) {
  if (missingEnv()) {
    return { skipped: true, reason: "missing_twilio_env" as const };
  }

  const client = twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!);

  try {
    const msg = await client.messages.create({
      to,
      from: TWILIO_NUMBER!,
      body,
    });
    console.log("[sms] sent:", { sid: msg.sid });
    return { ok: true as const, sid: msg.sid };
  } catch (err: any) {
    console.error("[sms] error:", err?.message || err);
    throw err;
  }
}
