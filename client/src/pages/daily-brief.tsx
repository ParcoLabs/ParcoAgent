import * as React from "react";
import Sidebar from "@/components/dashboard/sidebar";
import { api } from "@/lib/api";

type Brief = {
  generatedAt: string;
  counts: { overdueSLAs: number; jobsStuck: number; newProspects: number; noticesSent: number };
  sections: { overdueSLAs: any[]; jobsStuck: any[]; newProspects: any[]; noticesSent: any[] };
  text: string;
};

type Toast = { id: string; kind: "success" | "error" | "info"; msg: string };
function useToasts() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = (t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((xs) => [...xs, { id, ...t }]);
    setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), 4000);
  };
  const remove = (id: string) => setToasts((xs) => xs.filter((x) => x.id !== id));
  return { toasts, push, remove };
}

export default function DailyBriefPage() {
  const { toasts, push, remove } = useToasts();
  const [loading, setLoading] = React.useState(true);
  const [brief, setBrief] = React.useState<Brief | null>(null);
  const [emailTo, setEmailTo] = React.useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await api<{ ok: boolean; brief: Brief }>("/agent/daily-brief");
      setBrief(res.brief);
    } catch {
      push({ kind: "error", msg: "Failed to load daily brief." });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(brief?.text || "");
      push({ kind: "success", msg: "Copied to clipboard." });
    } catch {
      push({ kind: "error", msg: "Copy failed." });
    }
  }

  async function emailMe() {
    if (!emailTo) { push({ kind: "info", msg: "Enter your email first." }); return; }
    try {
      await api("/agent/daily-brief/email", {
        method: "POST",
        body: JSON.stringify({ to: emailTo }),
        headers: { "Content-Type": "application/json" },
      });
      push({ kind: "success", msg: "Brief emailed." });
    } catch {
      push({ kind: "error", msg: "Email failed (not configured?)." });
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 md:flex-row flex-col">
      <div className="md:block hidden"><Sidebar /></div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Daily Brief</h2>
          <p className="text-sm text-gray-600">Overdue SLAs, stuck jobs, new prospects, notices.</p>
        </header>

        {/* Toasts */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl px-4 py-2 shadow border text-sm ${
                t.kind === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : t.kind === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-indigo-50 border-indigo-200 text-indigo-800"
              }`}
              onClick={() => remove(t.id)}
            >
              {t.msg}
            </div>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-2">
            <button onClick={load} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50" disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button onClick={copyToClipboard} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50" disabled={!brief}>
              Copy summary
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <input
                type="email"
                placeholder="you@company.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm"
                style={{ minWidth: 240 }}
              />
              <button
                onClick={emailMe}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                disabled={!brief}
              >
                Email me
              </button>
            </div>
          </div>

          {!brief && loading ? (
            <div className="text-gray-500">Generating…</div>
          ) : brief ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-xl border p-4">
                <div className="text-sm text-gray-500 mb-2">
                  Generated at {new Date(brief.generatedAt).toLocaleString()}
                </div>
                <pre className="whitespace-pre-wrap text-sm">{brief.text}</pre>
              </div>

              <div className="bg-white rounded-xl border p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">At a glance</div>
                <div className="space-y-2 text-sm">
                  <Row label="Overdue SLAs" value={brief.counts.overdueSLAs} />
                  <Row label="Jobs stuck >24h" value={brief.counts.jobsStuck} />
                  <Row label="New prospects (24h)" value={brief.counts.newProspects} />
                  <Row label="Notices sent" value={brief.counts.noticesSent} />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">No data.</div>
          )}
        </main>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
