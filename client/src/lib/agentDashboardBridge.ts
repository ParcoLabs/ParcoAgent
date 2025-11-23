// client/src/components/agent/AgentDashboardBridge.tsx
// React singleton that exposes a hook to trigger agent actions and shows a tiny toast.
// Also installs a global helper (window.ParcoAgent) for imperative triggers if needed.

import * as React from "react";
import { runAgentAction, emitAgentActivity, type AgentActionInput } from "@/lib/agentBridge";

type BridgeCtx = {
  run: (opts: AgentActionInput) => Promise<{ ok: boolean; data?: any; error?: any }>;
  note: (text: string, context?: AgentActionInput["context"]) => void;
};

const Ctx = React.createContext<BridgeCtx | null>(null);

export function useAgentAction() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useAgentAction must be used within <AgentDashboardBridge />");
  return c;
}

export default function AgentDashboardBridge({ children }: React.PropsWithChildren) {
  const [last, setLast] = React.useState<string | null>(null);
  const [show, setShow] = React.useState(false);
  const timer = React.useRef<number | null>(null);

  const run = React.useCallback(async (opts: AgentActionInput) => {
    const res = await runAgentAction(opts);
    const label = res.ok ? "Agent task complete" : "Agent task failed";
    setLast(label);
    setShow(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), 2400);
    return res;
  }, []);

  const note = React.useCallback((text: string, context?: AgentActionInput["context"]) => {
    emitAgentActivity(text, context);
    setLast("Agent noted");
    setShow(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), 1600);
  }, []);

  // Optional: expose an imperative global helper for places without React access
  React.useEffect(() => {
    (window as any).ParcoAgent = {
      run,
      note,
    };
    return () => {
      delete (window as any).ParcoAgent;
    };
  }, [run, note]);

  return (
    <Ctx.Provider value={{ run, note }}>
      {children}
      {/* Tiny toast */}
      <div
        className={`fixed bottom-6 right-6 z-[1000] transition-all ${
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <div className="rounded-xl border bg-white shadow px-3 py-2 text-sm">
          {last || "Agent updated"}
        </div>
      </div>
    </Ctx.Provider>
  );
}
