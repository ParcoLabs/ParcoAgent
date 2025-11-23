// client/src/components/agent/AgentDashboardBridge.tsx
import * as React from "react";
import AddVendorFromCard from "./AddVendorFromCard";
import { post } from "@/lib/api";

export default function AgentDashboardBridge() {
  const [running, setRunning] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  async function resetDemo() {
    setRunning(true);
    setErr(null);
    try {
      await post("/admin/reset", {});
      setToast("Demo data reset.");
    } catch (e: any) {
      setErr(e?.message || "Reset failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Agent ↔ Dashboard Actions</h3>
          {toast && <div className="text-sm text-emerald-700">{toast}</div>}
        </div>
        {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="rounded-2xl border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60"
            onClick={resetDemo}
            disabled={running}
          >
            {running ? "Resetting…" : "Reset Demo Data"}
          </button>
          {/* Add more one-click agent actions here if you want */}
        </div>
      </div>

      {/* Add Vendor from Business Card */}
      <AddVendorFromCard />
    </div>
  );
}
