// server/automation.ts
import { addAgentDrafts, listAgentDrafts, markAgentDraftSent, type AgentDraft } from "./storage.js";
import { sendEmail } from "./services/email.js";

export type Tenant = {
  id: string;
  name: string;
  email: string;
  unit: string;
  delinquent: boolean;
  amountDue: number;
  lastPaidAt?: string | null;
};

type GetTenantsFn = () => Promise<Tenant[]> | Tenant[];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function startAutomation(opts: {
  /** supply tenants from your data layer */
  getTenants: GetTenantsFn;
  /** if true, approve & send automatically (no human approval) */
  autoSend?: boolean;
  /** wake-up interval in ms */
  tickMs?: number;
}) {
  const tickMs = Number(opts.tickMs ?? process.env.AGENT_TICK_MS ?? 60_000);
  const autoSend =
    typeof opts.autoSend === "boolean"
      ? opts.autoSend
      : String(process.env.AGENT_AUTOSEND || "false").toLowerCase() === "true";

  // memory throttle to avoid spamming the same tenant (1x/week)
  const lastContactAt: Record<string, number> = {};

  async function processRentDelinquency() {
    const tenants = await opts.getTenants();
    const now = Date.now();

    for (const t of tenants) {
      if (!t.delinquent) continue;

      const last = lastContactAt[t.id] ?? 0;
      if (now - last < WEEK_MS) continue; // only once per week

      const subject = `Past-due balance for ${t.unit}`;
      const body = [
        `Hi ${t.name.split(" ")[0]},`,
        ``,
        `Our records show an outstanding balance of $${t.amountDue.toFixed(2)} for ${t.unit}.`,
        `You can pay via the resident portal or reply to this message if you need assistance.`,
        `If you've already paid, thank you—please disregard this notice.`,
        ``,
        `– Parco Property Management`,
      ].join("\n");

      // Create an auditable draft in the same system as maintenance messages
      const requestId = `BILLING-${t.id}`; // virtual thread per tenant
      const draft: Omit<AgentDraft, "id" | "createdAt" | "status"> = {
        requestId,
        kind: "tenant_billing",
        channel: "email",
        to: t.email,
        subject,
        body,
        vendorId: null,
        metadata: {
          tenantId: t.id,
          unit: t.unit,
          amountDue: t.amountDue,
          rule: "rent_delinquency",
        },
      };

      addAgentDrafts(requestId, [draft]);

      if (autoSend) {
        try {
          await sendEmail(t.email, subject, body);
          const all = listAgentDrafts(requestId) ?? [];
          const latest = all[all.length - 1];
          if (latest?.id) markAgentDraftSent(latest.id);
          console.log(`[automation] rent notice sent -> ${t.email}`);
        } catch (err) {
          console.warn(`[automation] email send failed -> ${t.email}`, err);
        }
      } else {
        console.log(`[automation] rent notice drafted (awaiting approval) -> ${t.email}`);
      }

      lastContactAt[t.id] = now;
    }
  }

  async function tick() {
    try {
      await processRentDelinquency();
      // future: add more rules here (SLA breach, vendor nudges, etc.)
    } catch (err) {
      console.error("[automation] tick error", err);
    }
  }

  // run immediately, then on interval
  tick();
  const id = setInterval(tick, tickMs);
  console.log(`[automation] started (tick=${tickMs}ms, autoSend=${autoSend})`);

  return () => {
    clearInterval(id);
    console.log("[automation] stopped");
  };
}
