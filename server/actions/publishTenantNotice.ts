// server/actions/publishTenantNotice.ts
import { sendEmail } from "../services/email.js";
import { sendSMS } from "../services/sms.js";

/**
 * Simple Agent action that notifies tenants.
 * propertyId: string
 * subject: string
 * message: string (plain text)
 */
export async function publishTenantNotice({ propertyId, subject, message }) {
  // For now we'll just fake tenant contact list:
  const tenants = [
    { name: "John Doe", email: "tenant1@example.com", phone: "+15555550123" },
    { name: "Jane Smith", email: "tenant2@example.com", phone: "+15555550124" },
  ];

  // Send email to all tenants
  for (const t of tenants) {
    await sendEmail({
      to: t.email,
      subject,
      html: `<p>Hi ${t.name},</p><p>${message}</p>`,
    });
  }

  // Send SMS summary
  for (const t of tenants) {
    await sendSMS({
      to: t.phone,
      text: `Notice: ${subject} — ${message.slice(0, 100)}...`,
    });
  }

  // Return what happened (shows up in Agent log)
  return {
    ok: true,
    sentTo: tenants.map(t => t.email),
  };
}
