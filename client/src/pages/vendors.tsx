// client/src/pages/vendors.tsx
import * as React from "react";
import Sidebar from "@/components/dashboard/sidebar";
import {
  useVendors,
  useVendorJobs,
  useJobProgress,
  useJobComplete,
  useVendorProspects,
} from "@/lib/vendors.hooks";
import { api } from "@/lib/api";

/* -----------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------*/
type VendorJobStatus = "pending" | "in_progress" | "completed" | string;
type VendorJob = {
  id: string;
  requestId: string;
  vendorId: string;
  vendorName?: string;
  title?: string;
  category?: string;
  priority?: string;
  status?: VendorJobStatus;
  property?: string;
  createdAt?: string;
  lastActivityAt?: string;
  note?: string | null;
  visit?: { when: string; window?: string; note?: string } | null;
  proof?: { url?: string | null; note?: string | null; addedAt: string } | null;
};

type Prospect = {
  id: string;
  requestId: string;
  vendorId: string;
  vendorName: string;
  trade?: string | null;
  email?: string | null;
  phone?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  note?: string | null;
  estimatedCost?: number | null;
};

/* -----------------------------------------------------------------------------
 * Modal (Tailwind-only)
 * ---------------------------------------------------------------------------*/
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] animate-fadeIn" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border bg-white shadow-2xl animate-scaleIn">
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <h3 className="text-base font-semibold">{title || "Modal"}</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: translateY(6px) scale(.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        .animate-fadeIn { animation: fadeIn .18s ease-out both }
        .animate-scaleIn { animation: scaleIn .18s ease-out both }
      `}</style>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------------------*/
export default function VendorsPage() {
  const { data: vendors } = useVendors();

  const {
    data: jobsRaw,
    isLoading: jobsLoading,
    error: jobsError,
    refetch: refetchJobs,
  } = useVendorJobs();
  const jobs: VendorJob[] = Array.isArray(jobsRaw) ? (jobsRaw as VendorJob[]) : [];

  const {
    data: prospectsRaw,
    isLoading: prospectsLoading,
    error: prospectsError,
    refetch: refetchProspects,
  } = useVendorProspects();
  const prospects: Prospect[] = Array.isArray(prospectsRaw) ? (prospectsRaw as Prospect[]) : [];

  const progress = useJobProgress();
  const complete = useJobComplete();

  const progressingId = (progress.variables as any)?.id as string | undefined;
  const completingId = (complete.variables as any)?.id as string | undefined;

  // toasts
  const [toasts, setToasts] = React.useState<{ id: string; msg: string; kind: "ok" | "err" }[]>([]);
  function toast(msg: string, kind: "ok" | "err" = "ok") {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }

  // budget cap & override pills for pending approvals
  const [budgetCaps, setBudgetCaps] = React.useState<Record<string, number | undefined>>({});
  const [overrideReasons, setOverrideReasons] = React.useState<Record<string, string | undefined>>({});

  // ------------ Approve (award) with guardrail + optional vendor notify ------------
  async function approveProspectWithGuardrail(p: Prospect) {
    const estimateStr = window.prompt(
      `Estimated cost for ${p.vendorName}? (USD)`,
      p.estimatedCost != null ? String(p.estimatedCost) : ""
    );
    const estimatedCost = estimateStr?.trim() ? Number(estimateStr) : undefined;
    const notifyVendor = window.confirm("Notify the vendor they were awarded?");

    try {
      await api(`/vendor-prospects/${p.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(estimatedCost !== undefined ? { estimatedCost } : {}),
          notifyVendor,
        }),
      });
      toast("Awarded — job created");
      refetchProspects();
      refetchJobs();
    } catch (e: any) {
      if (e?.status === 412 && (e.data?.policy === "budget_cap" || e.data?.cap !== undefined)) {
        const cap = e.data?.cap as number | undefined;
        if (cap !== undefined) setBudgetCaps((m) => ({ ...m, [p.id]: cap }));
        const reason = window.prompt(
          `Over budget${cap != null ? ` (cap $${cap})` : ""}. Enter override reason to proceed:`
        );
        if (!reason) return;
        try {
          await api(`/vendor-prospects/${p.id}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(estimatedCost !== undefined ? { estimatedCost } : {}),
              force: true,
              reason,
              notifyVendor,
            }),
          });
          setOverrideReasons((m) => ({ ...m, [p.id]: reason }));
          toast("Awarded with override — job created");
          refetchProspects();
          refetchJobs();
        } catch {
          toast("Approval failed", "err");
        }
      } else {
        toast("Approval failed", "err");
      }
    }
  }

  // -------- Proof Modal state + actions --------
  const [proofOpen, setProofOpen] = React.useState(false);
  const [proofJob, setProofJob] = React.useState<VendorJob | null>(null);
  const [proofUrl, setProofUrl] = React.useState("");
  const [proofNote, setProofNote] = React.useState("");
  const proofWasBlocking = React.useRef<boolean>(false);

  function openProofModal(job: VendorJob, openedFromBlockingComplete = false) {
    setProofJob(job);
    setProofUrl("");
    setProofNote("");
    proofWasBlocking.current = openedFromBlockingComplete;
    setProofOpen(true);
  }
  function closeProofModal() {
    setProofOpen(false);
    proofWasBlocking.current = false;
  }

  async function submitProof() {
    if (!proofJob) return;
    try {
      await api(`/jobs/${proofJob.id}/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: proofUrl || undefined, note: proofNote || undefined }),
      });
      toast("Proof attached");
      if (proofWasBlocking.current) {
        try {
          await complete.mutateAsync({ id: proofJob.id, note: "Completed after attaching proof" });
          toast("Marked completed");
        } catch {}
      }
      closeProofModal();
      await refetchJobs();
    } catch {
      toast("Failed to attach proof", "err");
    }
  }

  async function completeJobWithProof(j: VendorJob) {
    try {
      await complete.mutateAsync({ id: j.id, note: "Completed from Vendors page" });
      toast("Marked completed");
      refetchJobs();
    } catch (e: any) {
      if (e?.status === 412 && e.data?.policy === "proof_required") {
        openProofModal(j, true);
      } else {
        toast("Completion failed", "err");
      }
    }
  }

  // ---------------- Schedule Visit (🆕) ----------------
  const [schedOpen, setSchedOpen] = React.useState(false);
  const [schedJob, setSchedJob] = React.useState<VendorJob | null>(null);
  const [schedDate, setSchedDate] = React.useState("");
  const [schedTime, setSchedTime] = React.useState("");
  const [schedWindow, setSchedWindow] = React.useState("2h");
  const [schedNote, setSchedNote] = React.useState("");
  const [schedBusy, setSchedBusy] = React.useState(false);

  function openScheduleModal(job: VendorJob) {
    setSchedJob(job);
    setSchedDate("");
    setSchedTime("");
    setSchedWindow("2h");
    setSchedNote("");
    setSchedOpen(true);
  }
  function closeScheduleModal() {
    setSchedOpen(false);
  }
  function buildISO(date: string, time: string) {
    if (!date || !time) return new Date().toISOString();
    const [hh, mm] = time.split(":").map((x) => parseInt(x || "0", 10));
    const dt = new Date(date);
    dt.setHours(hh || 0, mm || 0, 0, 0);
    return dt.toISOString();
  }
  async function submitSchedule() {
    if (!schedJob) return;
    try {
      setSchedBusy(true);
      await api("/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule-visit",
          payload: {
            jobId: schedJob.id,
            when: buildISO(schedDate, schedTime),
            window: schedWindow || undefined,
            note: schedNote || undefined,
          },
        }),
      });
      toast("Visit scheduled");
      setSchedBusy(false);
      closeScheduleModal();
      refetchJobs();
    } catch {
      setSchedBusy(false);
      toast("Failed to schedule visit", "err");
    }
  }

  // -------- Declined accordion state --------
  const [showDeclined, setShowDeclined] = React.useState(false);

  // -------- Derived: match approved prospects to jobs (requestId + vendorId) ------
  const approvedProspects = prospects.filter((p) => p.status === "approved");
  const jobsByKey = React.useMemo(() => {
    const m = new Map<string, VendorJob>();
    for (const j of jobs) {
      m.set(`${j.requestId}:${j.vendorId}`, j);
    }
    return m;
  }, [jobs]);
  const awardedRows = approvedProspects.map((p) => ({
    prospect: p,
    job: jobsByKey.get(`${p.requestId}:${p.vendorId}`) || null,
  }));

  return (
    <div className="flex h-screen bg-gray-50 md:flex-row flex-col">
      <div className="md:block hidden">
        <Sidebar />
      </div>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded-lg shadow border text-sm ${
              t.kind === "ok"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* Proof modal */}
      <Modal open={proofOpen} onClose={closeProofModal} title="Attach Proof">
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            {proofJob?.title ? <span className="font-medium">{proofJob.title}</span> : "Service request"}{" "}
            {proofJob?.vendorName ? <span className="text-gray-500">• {proofJob.vendorName}</span> : null}
          </div>
          <label className="block">
            <div className="text-sm font-medium mb-1">Proof URL</div>
            <input
              type="url"
              placeholder="https://…"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />
          </label>
          <label className="block">
            <div className="text-sm font-medium mb-1">Note (optional)</div>
            <textarea
              rows={3}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="e.g., photo attached from site visit"
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
            />
          </label>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={closeProofModal} className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={submitProof}
              className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60"
              disabled={!proofUrl && !proofNote}
            >
              Attach
            </button>
          </div>
          <div className="text-xs text-gray-500">You can attach either a URL, a note, or both.</div>
        </div>
      </Modal>

      {/* 🆕 Schedule Visit modal */}
      <Modal open={schedOpen} onClose={closeScheduleModal} title="Schedule Visit">
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            {schedJob?.title ? <span className="font-medium">{schedJob.title}</span> : "Service request"}{" "}
            {schedJob?.vendorName ? <span className="text-gray-500">• {schedJob.vendorName}</span> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-sm font-medium mb-1">Date</div>
              <input
                type="date"
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm font-medium mb-1">Time</div>
              <input
                type="time"
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                value={schedTime}
                onChange={(e) => setSchedTime(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-sm font-medium mb-1">Arrival window</div>
              <select
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                value={schedWindow}
                onChange={(e) => setSchedWindow(e.target.value)}
              >
                <option value="1h">±1 hour</option>
                <option value="2h">±2 hours</option>
                <option value="4h">±4 hours</option>
              </select>
            </label>
          </div>

          <label className="block">
            <div className="text-sm font-medium mb-1">Note (optional)</div>
            <textarea
              rows={3}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="Optional message to tenant/vendor…"
              value={schedNote}
              onChange={(e) => setSchedNote(e.target.value)}
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={closeScheduleModal} className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={submitSchedule}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-60"
              disabled={schedBusy || !schedDate || !schedTime}
            >
              {schedBusy ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </div>
      </Modal>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Vendors</h2>
          <p className="text-sm text-gray-600">Directory of service partners & live jobs.</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Directory */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Directory</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(vendors ?? []).map((v: any) => (
                <div key={v.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition">
                  <div className="text-lg font-semibold">{v.name}</div>
                  <div className="text-sm text-gray-500 capitalize">{v.category || v.trade || "general"}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Prospects (Pending) */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Sourced Vendors (Pending)</h3>
            {prospectsLoading && <div className="text-gray-500">Loading prospects…</div>}
            {prospectsError && <div className="text-red-600">Failed to load prospects.</div>}

            {!prospectsLoading && prospects.filter((p) => p.status === "pending").length === 0 ? (
              <div className="text-gray-500">No pending sourced vendors yet. Use “Source 3 Quotes” from a request.</div>
            ) : null}

            <div className="space-y-3">
              {prospects
                .filter((p) => p.status === "pending")
                .map((p) => {
                  const cap = budgetCaps[p.id];
                  const reason = overrideReasons[p.id];
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-xl border p-4 flex items-start justify-between gap-3 hover:shadow-sm transition"
                    >
                      <div className="pr-3">
                        <div className="text-base font-semibold">{p.vendorName}</div>
                        <div className="text-sm text-gray-500">
                          {p.trade ?? "general"} • Request {p.requestId}
                        </div>
                        {p.note ? <div className="text-xs text-gray-500 mt-1 italic">{p.note}</div> : null}
                        <div className="mt-2 space-x-2 text-xs">
                          {p.estimatedCost != null && (
                            <span className="px-2 py-1 rounded-lg border bg-gray-50">Estimate: ${p.estimatedCost}</span>
                          )}
                          {cap != null && (
                            <span className="px-2 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800">
                              Cap: ${cap}
                            </span>
                          )}
                          {reason && (
                            <span className="px-2 py-1 rounded-lg border border-blue-300 bg-blue-50 text-blue-800">
                              Override: {reason}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          className="px-3 py-1 rounded-lg border text-sm"
                          onClick={() => approveProspectWithGuardrail(p)}
                        >
                          Award
                        </button>
                        <div className="text-xs text-gray-500 min-w-[140px] text-right">
                          {new Date(p.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* 🆕 Awarded (Approved) */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Awarded (Approved)</h3>

            {awardedRows.length === 0 ? (
              <div className="text-gray-500">No awarded vendors yet.</div>
            ) : (
              <div className="space-y-3">
                {awardedRows.map(({ prospect: p, job }) => {
                  const status = job?.status ?? "pending";
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-xl border p-4 flex items-start justify-between gap-3 hover:shadow-sm transition"
                    >
                      <div className="pr-3">
                        <div className="flex items-center gap-2">
                          <div className="text-base font-semibold">{p.vendorName}</div>
                          <span className="text-xs rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700 px-2 py-0.5">
                            Approved
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {p.trade ?? "general"} • Request {p.requestId}
                        </div>

                        {job ? (
                          <>
                            <div className="text-sm text-gray-900 mt-1">
                              {job.title || "Service request"}
                            </div>
                            <div className="mt-1">
                              <StatusPill status={status as VendorJobStatus} />
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-amber-700 mt-1">
                            Job not found yet — will appear shortly.
                          </div>
                        )}

                        <div className="mt-2 space-x-2 text-xs">
                          {p.estimatedCost != null && (
                            <span className="px-2 py-1 rounded-lg border bg-gray-50">
                              Estimate: ${p.estimatedCost}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {job ? (
                          <>
                            {status !== "completed" && (
                              <>
                                <button
                                  className="px-3 py-1 rounded-lg border text-sm"
                                  onClick={() =>
                                    progress.mutate(
                                      { id: job.id, note: "Progressed from Awarded section" },
                                      { onSuccess: () => { toast("Job in progress"); refetchJobs(); } }
                                    )
                                  }
                                  disabled={progress.isLoading && progressingId === job.id}
                                >
                                  {status === "pending"
                                    ? progress.isLoading && progressingId === job.id
                                      ? "Starting…"
                                      : "Start"
                                    : progress.isLoading && progressingId === job.id
                                    ? "Progressing…"
                                    : "Progress"}
                                </button>
                                <button
                                  className="px-3 py-1 rounded-lg border text-sm"
                                  onClick={() => openScheduleModal(job)}
                                >
                                  Schedule Visit
                                </button>
                                <button
                                  className="px-3 py-1 rounded-lg border text-sm"
                                  onClick={() => openProofModal(job)}
                                >
                                  Attach Proof
                                </button>
                                <button
                                  className="px-3 py-1 rounded-lg border text-sm"
                                  onClick={() => completeJobWithProof(job)}
                                  disabled={complete.isLoading && completingId === job.id}
                                >
                                  {complete.isLoading && completingId === job.id ? "Completing…" : "Complete"}
                                </button>
                              </>
                            )}
                            {status === "completed" && (
                              <span className="px-2 py-1 rounded-md text-xs border bg-gray-50">Done</span>
                            )}
                          </>
                        ) : null}

                        <div className="text-xs text-gray-500 min-w-[140px] text-right">
                          {new Date(p.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Declined accordion */}
          <section>
            <button
              onClick={() => setShowDeclined((s) => !s)}
              className="flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left"
            >
              <div className="text-sm font-semibold text-gray-700">
                Declined Quotes
                <span className="ml-2 rounded-md border bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600">
                  {prospects.filter((p) => p.status === "rejected").length}
                </span>
              </div>
              <span className="text-gray-500">{showDeclined ? "▴" : "▾"}</span>
            </button>

            {showDeclined && (
              <div className="mt-3 space-y-3">
                {prospects.filter((p) => p.status === "rejected").length === 0 ? (
                  <div className="text-gray-500">No declined quotes.</div>
                ) : null}

                {prospects
                  .filter((p) => p.status === "rejected")
                  .map((p) => (
                    <div
                      key={p.id}
                      className="bg-white rounded-xl border p-4 flex items-start justify-between gap-3"
                    >
                      <div className="pr-3">
                        <div className="text-base font-medium">{p.vendorName}</div>
                        <div className="text-sm text-gray-500">
                          {p.trade ?? "general"} • Request {p.requestId}
                        </div>
                        <div className="mt-2 space-x-2 text-xs">
                          {p.estimatedCost != null && (
                            <span className="px-2 py-1 rounded-lg border bg-gray-50">
                              Estimate: ${p.estimatedCost}
                            </span>
                          )}
                          <span className="px-2 py-1 rounded-lg border bg-gray-50">Declined</span>
                        </div>
                        {p.note ? (
                          <div className="mt-1 text-xs italic text-gray-500">{p.note}</div>
                        ) : null}
                      </div>
                      <div className="text-xs text-gray-500 min-w-[140px] text-right">
                        {new Date(p.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* Active & Recent Jobs */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Active & Recent Jobs</h3>

            {jobsLoading && <div className="text-gray-500">Loading jobs…</div>}
            {jobsError && <div className="text-red-600">Failed to load jobs.</div>}

            {!jobsLoading && jobs.length === 0 ? (
              <div className="text-gray-500">No jobs yet. Award a vendor to create one.</div>
            ) : null}

            {!jobsLoading && jobs.length > 0 ? (
              <div className="space-y-3">
                {jobs.map((j) => {
                  const status = (j.status ?? "pending") as VendorJobStatus;
                  const isDone = status === "completed";
                  const isProgressing = progress.isLoading && progressingId === j.id;
                  const isCompleting = complete.isLoading && completingId === j.id;

                  return (
                    <div
                      key={j.id}
                      className="bg-white rounded-xl border p-4 flex items-start justify-between gap-3 hover:shadow-sm transition"
                    >
                      <div className="pr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-gray-500">{j.vendorName}</span>
                          <StatusPill status={status} />
                        </div>
                        <div className="text-base font-medium">{j.title || "Service request"}</div>
                        <div className="text-sm text-gray-500">
                          {j.property ? `${j.property} • ` : ""}
                          {j.category ?? ""}
                          {j.priority ? ` • ${j.priority}` : ""}
                        </div>

                        {j.visit ? (
                          <div className="text-xs text-gray-500 mt-1">
                            Visit: {new Date(j.visit.when).toLocaleString()}
                            {j.visit.window ? ` (${j.visit.window})` : ""}
                            {j.visit.note ? ` — ${j.visit.note}` : ""}
                          </div>
                        ) : null}

                        {j.proof?.url ? (
                          <div className="text-xs text-emerald-700 mt-1">
                            Proof:{" "}
                            <a className="underline" href={j.proof.url} target="_blank" rel="noreferrer">
                              link
                            </a>
                          </div>
                        ) : null}

                        {j.note ? <div className="text-xs text-gray-500 mt-1 italic">{j.note}</div> : null}
                      </div>

                      <div className="flex items-center gap-3">
                        {!isDone && (
                          <>
                            <button
                              className="px-3 py-1 rounded-lg border text-sm"
                              disabled={isProgressing || isCompleting}
                              onClick={() =>
                                progress.mutate(
                                  { id: j.id, note: "Progressed from Vendors page" },
                                  {
                                    onSuccess: () => {
                                      toast("Job in progress");
                                      refetchJobs();
                                    },
                                  }
                                )
                              }
                            >
                              {status === "pending"
                                ? isProgressing
                                  ? "Starting…"
                                  : "Start"
                                : isProgressing
                                ? "Progressing…"
                                : "Progress"}
                            </button>
                            <button
                              className="px-3 py-1 rounded-lg border text-sm"
                              onClick={() => openScheduleModal(j)}
                            >
                              Schedule Visit
                            </button>
                            <button
                              className="px-3 py-1 rounded-lg border text-sm"
                              onClick={() => openProofModal(j)}
                            >
                              Attach Proof
                            </button>
                            <button
                              className="px-3 py-1 rounded-lg border text-sm"
                              disabled={isCompleting || isProgressing}
                              onClick={() => completeJobWithProof(j)}
                            >
                              {isCompleting ? "Completing…" : "Complete"}
                            </button>
                          </>
                        )}

                        {isDone && (
                          <span className="px-2 py-1 rounded-md text-xs border bg-gray-50">Done</span>
                        )}

                        <div className="text-xs text-gray-500 min-w-[140px] text-right">
                          {j.lastActivityAt
                            ? new Date(j.lastActivityAt).toLocaleString()
                            : j.createdAt
                            ? new Date(j.createdAt).toLocaleString()
                            : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}

/* ------------------------------- UI helpers ------------------------------- */
function StatusPill({ status }: { status: VendorJobStatus }) {
  const s = (status || "pending") as VendorJobStatus;
  const { label, cls } = statusMeta(s);
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}
function statusMeta(s: VendorJobStatus): { label: string; cls: string } {
  switch (s) {
    case "pending":
      return { label: "Pending", cls: "border-amber-300 bg-amber-50 text-amber-800" };
    case "in_progress":
      return { label: "In Progress", cls: "border-blue-300 bg-blue-50 text-blue-800" };
    case "completed":
      return { label: "Completed", cls: "border-emerald-300 bg-emerald-50 text-emerald-800" };
    default:
      return { label: String(s || "Pending"), cls: "border-gray-300 bg-gray-50 text-gray-700" };
  }
}
