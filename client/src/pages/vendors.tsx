// client/src/pages/vendors.tsx
import * as React from "react";
import Sidebar from "@/components/dashboard/sidebar";
import {
  useVendors,
  useVendorJobs,
  useJobProgress,
  useJobComplete,
} from "@/lib/hooks";

type Vendor = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  trade?: string | null;
};

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
};

export default function VendorsPage() {
  const { data: vendors, isLoading: vendorsLoading, error: vendorsError } = useVendors();
  const {
    data: jobsRaw,
    isLoading: jobsLoading,
    error: jobsError,
    refetch: refetchJobs,
  } = useVendorJobs();

  const jobs: VendorJob[] = Array.isArray(jobsRaw) ? (jobsRaw as VendorJob[]) : [];

  const progress = useJobProgress();
  const complete = useJobComplete();

  const progressingId = (progress.variables as any)?.id as string | undefined;
  const completingId = (complete.variables as any)?.id as string | undefined;

  return (
    <div className="flex h-screen bg-gray-50 md:flex-row flex-col">
      {/* Sidebar */}
      <div className="md:block hidden">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Vendors</h2>
          <p className="text-sm text-gray-600">Directory of service partners & live jobs.</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Directory */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Directory</h3>
            {vendorsLoading && <div className="text-gray-500">Loading vendors…</div>}
            {vendorsError && <div className="text-red-600">Failed to load vendors.</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(vendors ?? []).map((v: Vendor) => (
                <div key={v.id} className="bg-white rounded-xl border p-4">
                  <div className="text-lg font-semibold">{v.name}</div>
                  <div className="text-sm text-gray-500 capitalize">
                    {v.category || v.trade || "general"}
                  </div>
                  <div className="mt-2 text-sm">
                    {v.email ? (
                      <div>
                        Email:{" "}
                        <a className="text-blue-600" href={`mailto:${v.email}`}>
                          {v.email}
                        </a>
                      </div>
                    ) : null}
                    {v.phone ? (
                      <div>
                        Phone:{" "}
                        <a className="text-blue-600" href={`tel:${v.phone}`}>
                          {v.phone}
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Active & Recent Jobs */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Active & Recent Jobs</h3>

            {jobsLoading && <div className="text-gray-500">Loading jobs…</div>}
            {jobsError && <div className="text-red-600">Failed to load jobs.</div>}

            {!jobsLoading && jobs.length === 0 ? (
              <div className="text-gray-500">
                No jobs yet. Assign a vendor from a request to create one.
              </div>
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
                      className="bg-white rounded-xl border p-4 flex items-start justify-between gap-3"
                    >
                      {/* Left: details */}
                      <div className="pr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-gray-500">{j.vendorName}</span>
                          <StatusPill status={status} />
                        </div>

                        <div className="text-base font-medium">
                          {j.title || "Service request"}
                        </div>

                        <div className="text-sm text-gray-500">
                          {j.property ? `${j.property} • ` : ""}
                          {j.category ?? ""} {j.priority ? `• ${j.priority}` : ""}
                        </div>

                        {j.note ? (
                          <div className="text-xs text-gray-500 mt-1 italic">{j.note}</div>
                        ) : null}
                      </div>

                      {/* Right: actions + time */}
                      <div className="flex items-center gap-3">
                        {!isDone && (
                          <button
                            className="px-3 py-1 rounded-lg border text-sm"
                            disabled={isProgressing || isCompleting}
                            onClick={() =>
                              progress.mutate(
                                { id: j.id, note: "Progressed from Vendors page" },
                                { onSuccess: () => refetchJobs() }
                              )
                            }
                          >
                            {status === "pending" ? (isProgressing ? "Starting…" : "Start") : (isProgressing ? "Progressing…" : "Progress")}
                          </button>
                        )}
                        {!isDone && (
                          <button
                            className="px-3 py-1 rounded-lg border text-sm"
                            disabled={isCompleting || isProgressing}
                            onClick={() =>
                              complete.mutate(
                                { id: j.id, note: "Completed from Vendors page" },
                                { onSuccess: () => refetchJobs() }
                              )
                            }
                          >
                            {isCompleting ? "Completing…" : "Complete"}
                          </button>
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
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
  );
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
