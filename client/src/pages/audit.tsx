// client/src/pages/audit.tsx
import * as React from "react";
import Sidebar from "@/components/dashboard/sidebar";
import { useAudit } from "@/lib/hooks";

/* small toast */
function useToasts() {
  const [items, set] = React.useState<Array<{ id:number; kind:"ok"|"err"; msg:string }>>([]);
  const add = (kind:"ok"|"err", msg:string) => {
    const id = Date.now() + Math.random();
    set((s)=>[...s,{id,kind,msg}]);
    setTimeout(()=>set((s)=>s.filter(x=>x.id!==id)), 3000);
  };
  return { add, items };
}
function Toasts({ items }:{items:Array<{id:number;kind:"ok"|"err";msg:string}>}) {
  return (
    <div className="fixed top-3 right-3 z-[9999] space-y-2">
      {items.map(t=>(
        <div key={t.id} className={`rounded-lg border px-3 py-2 text-sm shadow ${
          t.kind==="ok" ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-rose-50 border-rose-300 text-rose-800"
        }`}>{t.msg}</div>
      ))}
    </div>
  );
}

export default function AuditPage() {
  const [filters, setFilters] = React.useState<{ actor?: string; action?: string; requestId?: string; jobId?: string }>({});
  const { data, isLoading, refetch, isFetching } = useAudit(filters);
  const { items, add } = useToasts();

  // client-side quick search
  const [q, setQ] = React.useState("");

  const itemsArray = Array.isArray(data) ? (data as any[]) : [];
  const sorted = React.useMemo(
    () =>
      [...itemsArray].sort((a, b) => {
        const ta = +new Date(a.at || a.ts || 0);
        const tb = +new Date(b.at || b.ts || 0);
        return tb - ta;
      }),
    [itemsArray]
  );

  const filtered = React.useMemo(() => {
    if (!q.trim()) return sorted;
    const needle = q.toLowerCase();
    return sorted.filter((a) => {
      const hay =
        `${a.actor ?? ""} ${a.action ?? ""} ${a.requestId ?? ""} ${a.jobId ?? ""} ${JSON.stringify(a.meta ?? {})}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [sorted, q]);

  function copyRow(a: any) {
    try {
      navigator.clipboard.writeText(JSON.stringify(a, null, 2));
      add("ok", "Copied row JSON");
    } catch {
      add("err", "Copy failed");
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Toasts items={items} />
      <div className="md:block hidden"><Sidebar /></div>

      <main className="flex-1 p-6">
        <div className="flex items-end justify-between mb-4 gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Audit Log</h1>
            <p className="text-sm text-gray-600">Actions, guardrail decisions, and system events.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex gap-3 flex-wrap items-center">
          <select
            className="border rounded px-2 py-1"
            value={filters.actor || ""}
            onChange={e => setFilters(f => ({ ...f, actor: e.target.value || undefined }))}
            title="Actor"
          >
            <option value="">Actor: Any</option>
            <option value="agent">agent</option>
            <option value="system">system</option>
            <option value="guardrail">guardrail</option>
            <option value="user">user</option>
          </select>

          <select
            className="border rounded px-2 py-1"
            value={filters.action || ""}
            onChange={e => setFilters(f => ({ ...f, action: e.target.value || undefined }))}
            title="Action"
          >
            <option value="">Action: Any</option>
            <option value="publish-tenant-notice">publish-tenant-notice</option>
            <option value="schedule-visit">schedule-visit</option>
            <option value="job-progress">job-progress</option>
            <option value="job-complete">job-complete</option>
            <option value="assign-vendor">assign-vendor</option>
            <option value="approve-vendor">approve-vendor</option>
            <option value="proof-attached">proof-attached</option>
            <option value="source-3-quotes">source-3-quotes</option>
            <option value="run-agent">run-agent</option>
            <option value="daily-brief-run">daily-brief-run</option>
            <option value="policy-deny">policy-deny</option>
            <option value="admin-reset">admin-reset</option>
          </select>

          <input
            className="border rounded px-2 py-1"
            placeholder="Request ID (e.g., REQ-1005)"
            value={filters.requestId || ""}
            onChange={e => setFilters(f => ({ ...f, requestId: e.target.value || undefined }))}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="Job ID"
            value={filters.jobId || ""}
            onChange={e => setFilters(f => ({ ...f, jobId: e.target.value || undefined }))}
          />

          <div className="ml-auto flex items-center gap-2">
            <input
              className="border rounded px-2 py-1"
              placeholder="Quick search meta/text…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            <button
              onClick={() => setQ("")}
              className="rounded border px-2 py-1 text-sm bg-white hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow divide-y">
          {isLoading && <div className="p-4 text-gray-500">Loading…</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="p-8 text-center text-gray-500">No audit entries.</div>
          )}
          {filtered.map((a: any, i: number) => (
            <div key={a.id || i} className="p-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs text-gray-500">
                  {a.at || a.ts ? new Date(a.at || a.ts).toLocaleString() : ""}
                </div>
                <button
                  className="rounded border bg-white px-2 py-1 text-xs hover:bg-gray-50"
                  onClick={() => copyRow(a)}
                >
                  Copy JSON
                </button>
              </div>

              <div className="mt-0.5 font-semibold">{a.action}</div>
              <div className="text-gray-700">
                actor: <span className="font-mono">{a.actor}</span>
                {a.requestId ? <> • request: <span className="font-mono">{a.requestId}</span></> : null}
                {a.jobId ? <> • job: <span className="font-mono">{a.jobId}</span></> : null}
                {a.propertyId ? <> • property: <span className="font-mono">{a.propertyId}</span></> : null}
              </div>

              {a.meta && (
                <pre className="mt-2 bg-gray-50 rounded p-2 overflow-auto text-[12px] leading-5">
{JSON.stringify(a.meta, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
