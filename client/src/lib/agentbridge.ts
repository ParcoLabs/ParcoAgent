// client/src/lib/agentBridge.ts
// Unified Agent Bridge: lets any page trigger agent actions and emit visible chat activity.
// Uses localStorage events so AgentConsole picks up activity across routes/tabs.

export type AgentContext = {
  requestId?: string | number;
  propertyId?: string | number;
  propertyName?: string;
  [k: string]: any;
};

export type AgentActionInput = {
  action: string;                 // e.g. "source-quotes", "property-create-listing", "schedule-visit"
  input?: Record<string, any>;    // payload for the action
  context?: AgentContext;         // enriches visibility + chat context
  echo?: string;                  // optional human-readable message to display immediately in chat
};

export type BridgeMessage =
  | { kind: "activity"; id: string; ts: number; role: "assistant"; text: string; context?: AgentContext }
  | { kind: "error"; id: string; ts: number; role: "assistant"; text: string; context?: AgentContext };

const BRIDGE_KEY = "parco.agent.bridge";       // storage queue for cross-page chat activity
const uid = () => "id-" + Math.random().toString(36).slice(2, 10);

function pushToBridge(msg: BridgeMessage) {
  try {
    const item = { ...msg, _nonce: Math.random().toString(36).slice(2, 8) }; // ensure storage event fires
    localStorage.setItem(BRIDGE_KEY, JSON.stringify(item));
  } catch {
    // no-op
  }
}

export function emitAgentActivity(text: string, context?: AgentContext) {
  pushToBridge({ kind: "activity", id: uid(), ts: Date.now(), role: "assistant", text, context });
}

export function emitAgentError(text: string, context?: AgentContext) {
  pushToBridge({ kind: "error", id: uid(), ts: Date.now(), role: "assistant", text, context });
}

/**
 * Execute an agent action via backend and surface activity to Agent chat.
 * For playbooks that already exist in your server:
 *  - /api/agent/execute (preferred)
 *  - /api/agent/run     (legacy "source-quotes" path)
 */
export async function runAgentAction(opts: AgentActionInput) {
  const { action, input = {}, context, echo } = opts;

  if (echo) {
    emitAgentActivity(echo, context);
  } else {
    emitAgentActivity(`Running: ${action}`, context);
  }

  // Route request: legacy mode or unified execute
  const isSourceQuotes =
    action === "source-quotes" ||
    action === "source_3_quotes" ||
    action === "source-3-quotes";

  try {
    let res: Response;
    if (isSourceQuotes) {
      // Legacy flow uses /api/agent/run with mode: "source-quotes"
      const body = { requestId: input?.requestId, mode: "source-quotes", allowDuplicates: !!input?.allowDuplicates, force: !!input?.force };
      res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      // Unified execute
      res = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mapFriendlyAction(action), payload: input }),
      });
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const reason = (data && (data.error || data.message)) || `HTTP ${res.status}`;
      emitAgentError(`Failed: ${action} — ${reason}`, context);
      return { ok: false, error: reason, data };
    }

    // Summarize result into a compact, human-readable chat line
    const summary = summarizeActionResult(action, data);
    emitAgentActivity(summary, context);
    return { ok: true, data };
  } catch (err: any) {
    emitAgentError(`Error: ${action} — ${err?.message || String(err)}`, context);
    return { ok: false, error: err?.message || String(err) };
  }
}

function mapFriendlyAction(action: string): string {
  // Map human button labels to server action ids (keep adding as needed)
  switch (action) {
    case "create-listing":
    case "property-create-listing":
      return "property-create-listing";
    case "publish-listing":
    case "property-publish-listing":
      return "property-publish-listing";
    case "schedule-visit":
      return "schedule-visit";
    case "send-visit-confirmations":
      return "send-visit-confirmations";
    // vendor approval is already a direct endpoint; we still allow bridging as a log-only activity
    default:
      return action;
  }
}

function summarizeActionResult(action: string, data: any): string {
  const a = action.toLowerCase();

  // /api/agent/run (source-quotes) result
  if (a.includes("source") && a.includes("quote")) {
    const count = data?.created ?? data?.prospects?.length ?? 0;
    return `Sourced ${count} vendor quotes and created outreach drafts.`;
  }

  // /api/agent/execute results
  if (a.includes("publish") && a.includes("listing")) {
    const posted = data?.results?.[0]?.result?.postedTo || data?.postedTo || [];
    const sites = posted.map((p: any) => p.site).join(", ") || "listing sites";
    return `Listing published to ${sites}.`;
  }

  if (a.includes("create") && a.includes("listing")) {
    const price = data?.results?.[0]?.result?.priceSuggested ?? data?.result?.priceSuggested;
    return `Listing draft created. Suggested rent: $${Number(price || 0).toLocaleString()}/mo.`;
    }

  if (a.includes("schedule-visit")) {
    const jobId = data?.results?.[0]?.job?.id ?? data?.job?.id ?? "job";
    const when = data?.results?.[0]?.job?.visit?.when ?? data?.job?.visit?.when ?? "";
    return `Visit scheduled for ${jobId}${when ? ` at ${new Date(when).toLocaleString()}` : ""}.`;
  }

  if (a.includes("visit-confirmations")) {
    const sent = data?.results?.[0]?.sent ?? data?.sent ?? [];
    return `Visit confirmations sent via ${sent.join(", ") || "selected channels"}.`;
  }

  // Fallback generic summary
  return `Action completed: ${action}.`;
}
