// client/src/pages/requests.tsx
import * as React from "react";
import Sidebar from "@/components/dashboard/sidebar";
import RequestDetailsPane from "@/components/requests/RequestDetailsPane";
import {
  useRequests,
  useRunAgent,
  useAssignVendor,
  useVendors,
  useProperties,
  useCreateRequest,
} from "@/lib/hooks";
import { Wrench, Filter, Search, Plus, Layers3, MessagesSquare } from "lucide-react";

/* ----------------------- lightweight toast ----------------------- */
function useToasts() {
  const [toasts, setToasts] = React.useState<Array<{ id: number; kind: "success" | "error"; msg: string }>>([]);
  const add = React.useCallback((kind: "success" | "error", msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  return { toasts, add };
}
function ToastRack({ toasts }: { toasts: Array<{ id: number; kind: "success" | "error"; msg: string }> }) {
  return (
    <div className="fixed top-3 right-3 z-[9999] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg border px-3 py-2 text-sm shadow-md ${
            t.kind === "success" ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-rose-50 border-rose-300 text-rose-800"
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* -------------------------- types/helpers ------------------------- */
type Req = {
  id: string;
  title?: string;
  summary?: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | string;
  priority?: "P1" | "P2" | "P3" | "Low" | "Medium" | "High" | "Urgent" | string;
  category?: string;
  property?: { id?: string; name?: string } | string;
  createdAt?: string;
  tenantName?: string;
};
function normStatus(s?: string) {
  if (!s) return "OPEN";
  const t = s.toUpperCase().replace(/\s+/g, "_");
  if (t.includes("PROGRESS")) return "IN_PROGRESS";
  if (t.includes("RESOLVED") || t.includes("CLOSED")) return "RESOLVED";
  return "OPEN";
}
function normalizePriority(p?: string): "Low" | "Medium" | "High" | "Urgent" {
  const t = (p || "").toUpperCase();
  if (t === "P1" || t === "HIGH") return "High";
  if (t === "URGENT") return "Urgent";
  if (t === "P2" || t === "MEDIUM") return "Medium";
  if (t === "P3" || t === "LOW") return "Low";
  return "Medium";
}
function StatusPill({ status }: { status?: string }) {
  const s = normStatus(status);
  const map: Record<string, string> = {
    OPEN: "border-amber-300 bg-amber-50 text-amber-800",
    IN_PROGRESS: "border-blue-300 bg-blue-50 text-blue-800",
    RESOLVED: "border-emerald-300 bg-emerald-50 text-emerald-800",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${map[s] || "border-gray-300 bg-gray-50 text-gray-700"}`}>{s.replace("_"," ")}</span>;
}
function PriorityPill({ priority }: { priority?: string }) {
  const n = normalizePriority(priority);
  const map: Record<string, string> = {
    Urgent: "border-rose-400 bg-rose-50 text-rose-800",
    High: "border-rose-300 bg-rose-50 text-rose-800",
    Medium: "border-orange-300 bg-orange-50 text-orange-800",
    Low: "border-gray-300 bg-gray-50 text-gray-700",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${map[n]}`}>{n}</span>;
}
function ToolbarButton(props: {
  label: string; onClick?: () => void; icon?: React.ReactNode;
  variant?: "default" | "primary"; disabled?: boolean; title?: string;
}) {
  const { label, onClick, icon, variant = "default", disabled, title } = props;
  return (
    <button
      type="button" title={title} onClick={onClick} disabled={disabled}
      className={[
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
        variant === "primary" ? "bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-60" : "border bg-white hover:bg-gray-50 disabled:opacity-60",
      ].join(" ")}
    >
      {icon}<span>{label}</span>
    </button>
  );
}
function AssignDropdown({
  vendors,onAssign,disabled,
}: { vendors: Array<{ id:string; name:string }>; onAssign:(id:string)=>void; disabled?:boolean; }) {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  return (
    <div className="relative">
      <button
        className="text-xs rounded-lg border px-2 py-1 inline-flex items-center gap-1 hover:bg-gray-50 disabled:opacity-60"
        disabled={disabled}
        onClick={(e)=>{e.stopPropagation(); if(!disabled) setOpen((s)=>!s);}}
      >
        <Wrench className="h-3.5 w-3.5" /> Assign
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border bg-white shadow-lg p-2" onClick={(e)=>e.stopPropagation()}>
          <input className="w-full rounded-md border px-2 py-1 text-xs mb-2" placeholder="Filter vendors…" value={filter} onChange={(e)=>setFilter(e.target.value)} />
          <div className="max-h-56 overflow-auto">
            {vendors.filter(v=>v.name.toLowerCase().includes(filter.toLowerCase())).map(v=>(
              <button key={v.id} className="w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-50" onClick={()=>{onAssign(v.id); setOpen(false);}}>
                {v.name}
              </button>
            ))}
            {vendors.length===0 && <div className="text-xs text-gray-500 px-2 py-1">No vendors</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- page -------------------------------- */
export default function RequestsPage() {
  const { data: requests = [], isLoading } = useRequests();
  const { data: vendors = [] } = useVendors();
  const { data: properties = [] } = useProperties();
  const { toasts, add } = useToasts();

  // IMPORTANT: UI mode "source_quotes" maps to API "source-quotes"
  type AgentMode = "both" | "tenant_update" | "source_quotes";
  const [mode, setMode] = React.useState<AgentMode>("both");

  // force-refresh key so drafts re-mount immediately after agent success
  const [draftsRefreshKey, setDraftsRefreshKey] = React.useState(0);

  const runAgent = useRunAgent({
    onSuccess: (_res: any, vars: any) => {
      const m: AgentMode = vars?.mode ?? "both";
      add("success",
        m==="both" ? "Generated tenant & vendor drafts"
        : m==="tenant_update" ? "Published tenant update"
        : "Sourced 3 quotes"
      );
      setDraftsRefreshKey(k=>k+1); // re-mount drafts area
    },
    onError: (err: any) => add("error", `Agent failed: ${err?.message || "Unknown error"}`),
  });

  const assignVendor = useAssignVendor({
    onSuccess: () => add("success", "Vendor assigned"),
    onError: (err: any) => add("error", `Assign failed: ${err?.message || "Unknown error"}`),
  });

  const createRequest = useCreateRequest({
    onSuccess: (res: any) => {
      add("success", "Request created");
      const id = res?.id || res?.requestId;
      if (id) {
        const u = new URL(window.location.href);
        u.searchParams.set("select", String(id));
        window.history.replaceState(null, "", u.toString());
      }
      setOpenNew(false); setNrSummary(""); setNrTenant(""); setNrCategory("Other"); setNrPriority("Medium");
    },
    onError: (err: any) => add("error", `Create failed: ${err?.message || "Unknown error"}`),
  });

  const [selected, setSelected] = React.useState<Req | null>(null);

  // filters
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [priority, setPriority] = React.useState<string>("all");
  const [propertyId, setPropertyId] = React.useState<string>("all");

  // new request modal state
  const [openNew, setOpenNew] = React.useState(false);
  const [nrSummary, setNrSummary] = React.useState("");
  const [nrCategory, setNrCategory] = React.useState<"Plumbing"|"Electrical"|"HVAC"|"Noise"|"Other">("Other");
  const [nrPriority, setNrPriority] = React.useState<"Low"|"Medium"|"High"|"Urgent">("Medium");
  const [nrPropertyId, setNrPropertyId] = React.useState("");
  const [nrTenant, setNrTenant] = React.useState("");

  React.useEffect(()=>{ if(properties.length && !nrPropertyId) setNrPropertyId(properties[0]?.id ?? ""); },[properties, nrPropertyId]);

  // deep link ?select=
  React.useEffect(()=>{
    const id = new URLSearchParams(window.location.search).get("select");
    if (id && requests.length) {
      const found = (requests as Req[]).find(r => String(r.id) === String(id));
      if (found) setSelected(found);
    }
  },[requests]);

  // sync selection to URL
  React.useEffect(()=>{
    if(!selected) return;
    const u = new URL(window.location.href);
    u.searchParams.set("select", String(selected.id));
    window.history.replaceState(null, "", u.toString());
  },[selected]);

  const filtered = React.useMemo(()=> (requests as Req[])
    .filter(r => (status==="all" ? true : normStatus(r.status)===status))
    .filter(r => {
      if (priority==="all") return true;
      return normalizePriority(r.priority)===priority;
    })
    .filter(r => {
      if (propertyId==="all") return true;
      const p = r.property;
      const id = typeof p === "string" ? undefined : p?.id;
      const name = typeof p === "string" ? p : p?.name;
      const wanted = propertyId;
      return id===wanted || name===properties.find((pp:any)=>pp.id===wanted)?.name;
    })
    .filter(r => {
      if(!q.trim()) return true;
      const hay = `${r.id} ${r.title??""} ${r.summary??""} ${r.category??""} ${(typeof r.property==="string"?r.property:(r.property?.name||""))} ${r.tenantName??""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    })
    .sort((a,b)=> new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime())
  , [requests,status,priority,propertyId,q,properties]);

  React.useEffect(()=>{ if(!selected && filtered.length>0) setSelected(filtered[0]); },[filtered,selected]);

  const canRun = !!selected && !runAgent.isPending;
  const runAgentNow = () => {
    if(!selected) return;
    const wireMode = mode === "source_quotes" ? "source-quotes" : mode;
    runAgent.mutate({ requestId: selected.id, mode: wireMode });
  };
  const runSourceQuotes = (reqId?: string) => {
    const id = reqId || selected?.id;
    if (!id) return;
    runAgent.mutate({ requestId: id, mode: "source-quotes" });
  };

  function getPropName(r: Req) {
    if (!r.property) return "";
    return typeof r.property === "string" ? r.property : r.property?.name || "";
  }

  function onCreateNewRequest(e: React.FormEvent) {
    e.preventDefault();
    const prop = (properties as any[]).find((p:any)=>p.id===nrPropertyId);
    createRequest.mutate({
      summary: nrSummary || "New maintenance request",
      category: nrCategory,
      priority: nrPriority,
      property: prop?.name ?? "Unknown Unit",
      tenantName: nrTenant || undefined,
    });
  }

  return (
    <div className="flex h-screen bg-gray-50 md:flex-row flex-col">
      <ToastRack toasts={toasts} />

      {/* Sidebar */}
      <div className="md:block hidden"><Sidebar /></div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                Requests{selected ? <span className="text-gray-500 font-normal"> · {selected.title || selected.summary}</span> : null}
              </h2>
              <p className="text-sm text-gray-600">
                Today,&nbsp;{new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
              </p>
            </div>
            <ToolbarButton label="New Request" icon={<Plus className="h-4 w-4" />} onClick={()=>setOpenNew(true)} variant="primary" />
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-[420px,1fr]">
            {/* -------- Left list & filters -------- */}
            <div className="border-r bg-white overflow-hidden">
              <div className="p-3 border-b bg-white">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <input className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm"
                           placeholder="Search requests, tenants, properties…" value={q} onChange={(e)=>setQ(e.target.value)} />
                    <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  <Filter className="h-4 w-4 text-gray-500" title="Filters" />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <select className="rounded-lg border px-2 py-2 text-sm" value={status} onChange={(e)=>setStatus(e.target.value)}>
                    <option value="all">All statuses</option><option value="OPEN">Open</option><option value="IN_PROGRESS">In Progress</option><option value="RESOLVED">Resolved</option>
                  </select>
                  <select className="rounded-lg border px-2 py-2 text-sm" value={priority} onChange={(e)=>setPriority(e.target.value)}>
                    <option value="all">All priorities</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Urgent">Urgent</option>
                  </select>
                  <select className="rounded-lg border px-2 py-2 text-sm" value={propertyId} onChange={(e)=>setPropertyId(e.target.value)}>
                    <option value="all">All properties</option>
                    {properties.map((p:any)=> (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
              </div>

              <div className="overflow-auto h-[calc(100vh-170px)] p-2">
                {isLoading ? (
                  <div className="p-4 text-sm text-gray-500">Loading requests…</div>
                ) : filtered.length===0 ? (
                  <div className="p-4 text-sm text-gray-500 space-y-2">
                    <div>No requests match the filters.</div>
                    <button className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-gray-50" onClick={()=>setOpenNew(true)}>
                      <Plus className="h-3 w-3" /> Create your first request
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {filtered.map(r=>{
                      const active = selected?.id===r.id;
                      return (
                        <li key={r.id}
                            className={`rounded-lg border p-3 hover:shadow-sm cursor-pointer transition ${active ? "border-gray-900 ring-1 ring-gray-900/10" : "bg-white"}`}
                            onClick={()=>setSelected(r)}>
                          <div className="flex items-start justify-between">
                            <div className="pr-3">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold">{r.title || r.summary || "Request"}</div>
                                <StatusPill status={r.status} />
                                {r.priority ? <PriorityPill priority={r.priority}/> : null}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">{getPropName(r)} • {r.category ?? "—"}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{new Date(r.createdAt||Date.now()).toLocaleString()}</div>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              <button className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50 disabled:opacity-60"
                                      title="Source 3 Quotes" disabled={runAgent.isPending}
                                      onClick={(e)=>{e.stopPropagation(); runSourceQuotes(r.id);}}>
                                {runAgent.isPending ? "Sourcing…" : "Source 3 Quotes"}
                              </button>
                              <AssignDropdown vendors={vendors as any[]} disabled={false}
                                              onAssign={(vendorId)=>assignVendor.mutate({ requestId: r.id, vendorId })}/>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* -------- Right: details, then AI Agent Drafts card -------- */}
            <div className="overflow-auto p-4 md:p-6">
              {selected ? (
                <div className="space-y-4">
                  {/* Top description card */}
                  <div className="rounded-xl border bg-white p-4">
                    <div className="text-lg font-semibold mb-1">{selected.title || selected.summary || "Request details"}</div>
                    <div className="text-xs text-gray-500 mb-3">Created {new Date(selected.createdAt || Date.now()).toLocaleString()}</div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selected.priority ? <PriorityPill priority={selected.priority}/> : null}
                      <StatusPill status={selected.status}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><div className="text-gray-500">Tenant</div><div>{selected.tenantName || "—"}</div></div>
                      <div><div className="text-gray-500">Category / Unit</div>
                        <div>{selected.category || "Other"} • {typeof selected.property==="string" ? selected.property : selected.property?.name || "—"}</div>
                      </div>
                    </div>
                  </div>

                  {/* AI Agent Drafts card */}
                  <div className="rounded-xl border bg-white">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <div className="text-base font-semibold">AI Agent Drafts</div>
                      <div className="flex items-center gap-2">
                        <select className="rounded-lg border px-2 py-1 text-sm" value={mode} onChange={(e)=>setMode(e.target.value as AgentMode)}>
                          <option value="both">Both</option>
                          <option value="tenant_update">Tenant Notice</option>
                          <option value="source_quotes">Source 3 Quotes</option>
                        </select>
                        <ToolbarButton
                          label={runAgent.isPending ? "Running…" : "Run Agent"}
                          icon={<MessagesSquare className="h-4 w-4" />}
                          variant="primary"
                          onClick={runAgentNow}
                          disabled={!canRun}
                          title="Generate drafts/notices for this request"
                        />
                      </div>
                    </div>
                    <div className="p-4" key={draftsRefreshKey}>
                      {/* This renders vendor+tenant drafts with Approve & Send */}
                      <RequestDetailsPane selected={selected} />
                    </div>
                  </div>

                  {/* Quotes quick action */}
                  <div className="rounded-xl border bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-semibold">Quotes</div>
                      <ToolbarButton
                        label={runAgent.isPending ? "Sourcing…" : "Source 3 Quotes"}
                        icon={<Layers3 className="h-4 w-4" />}
                        onClick={()=>runSourceQuotes()}
                        disabled={!canRun}
                        title="Ask the agent to source quotes"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Select a request to view details.</div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* New Request Modal */}
      {openNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setOpenNew(false)} />
          <form onSubmit={onCreateNewRequest} className="relative z-10 w-full max-w-lg rounded-xl bg-white p-5 shadow-xl border" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-3">Create Request</div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Summary</label>
                <input className="w-full rounded-md border px-3 py-2 text-sm" value={nrSummary} onChange={(e)=>setNrSummary(e.target.value)} placeholder="e.g., Leak under kitchen sink" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Category</label>
                  <select className="w-full rounded-md border px-3 py-2 text-sm" value={nrCategory} onChange={(e)=>setNrCategory(e.target.value as any)}>
                    {["Plumbing","Electrical","HVAC","Noise","Other"].map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Priority</label>
                  <select className="w-full rounded-md border px-3 py-2 text-sm" value={nrPriority} onChange={(e)=>setNrPriority(e.target.value as any)}>
                    {["Low","Medium","High","Urgent"].map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Property</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={nrPropertyId} onChange={(e)=>setNrPropertyId(e.target.value)}>
                  {properties.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tenant (optional)</label>
                <input className="w-full rounded-md border px-3 py-2 text-sm" value={nrTenant} onChange={(e)=>setNrTenant(e.target.value)} placeholder="e.g., Marcus Lee" />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={()=>setOpenNew(false)}>Cancel</button>
              <button type="submit" className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60" disabled={createRequest.isPending}>
                {createRequest.isPending ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
