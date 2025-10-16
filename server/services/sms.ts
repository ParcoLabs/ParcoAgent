// server/services/sms.ts
// Twilio SMS sender with graceful fallback.
// Uses: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_NUMBER
// Optional: USE_SMS_FOR_VENDOR, SMS_DEMO_TO

type SendResult =
  | { ok: true; sid: string; to: string }
  | { skipped: true; reason: string };

const TW_SID  = process.env.TWILIO_ACCOUNT_SID?.trim();
const TW_AUTH = process.env.TWILIO_AUTH_TOKEN?.trim();
const TW_FROM = process.env.TWILIO_NUMBER?.trim();

const USE_SMS_FOR_VENDOR =
  String(process.env.USE_SMS_FOR_VENDOR || "").toLowerCase() === "true";
const SMS_DEMO_TO = process.env.SMS_DEMO_TO?.trim();

export async function sendSMS(to: string, body: string): Promise<SendResult> {
  // Respect global switch (optional). If disabled, skip.
  if (!USE_SMS_FOR_VENDOR) {
    return { skipped: true, reason: "sms_disabled" };
  }

  // Missing creds? Skip gracefully.
  if (!TW_SID || !TW_AUTH || !TW_FROM) {
    return { skipped: true, reason: "missing_twilio_config" };
  }

  // Demo override: send to one safe number even if UI says otherwise
  const finalTo = SMS_DEMO_TO || to;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
    TW_SID
  )}/Messages.json`;

  const creds = Buffer.from(`${TW_SID}:${TW_AUTH}`).toString("base64");

  const params = new URLSearchParams();
  params.set("To", finalTo);
  params.set("From", TW_FROM);
  params.set("Body", body);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const json = await safeJson(res);

    if (!res.ok) {
      console.warn("[sms] Twilio error:", res.status, res.statusText, json);
      return { skipped: true, reason: `twilio_${res.status}` };
    }

    const sid = json?.sid || json?.SID || "unknown";
    console.log("[sms] sent", { to: finalTo, sid, demo: Boolean(SMS_DEMO_TO) });
    return { ok: true, sid: String(sid), to: finalTo };
  } catch (err: any) {
    console.error("[sms] exception:", err?.message || err);
    return { skipped: true, reason: "twilio_exception" };
  }
}

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}
