// client/src/pages/vendors.tsx
import * as React from "react";
import Sidebar from "@/components/dashboard/sidebar";
import { useVendors, useVendorJobs } from "@/lib/hooks";

type Vendor = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  trade?: string | null;
};

type VendorJob = {
  id: string;
  requestId: string;
  vendorId: string;
  vendorName?: string;
  title?: string;
  category?: string;
  priority?: string;
  status?: string;
  property?: string;
  createdAt?: string;
  lastActivityAt?: string;
  note?: string | null;
};

export default function VendorsPage() {
  const {
    data: vendors,
    isLoading: vendorsLoading,
    error: vendorsError,
  } = useVendors();

  // useVendorJobs now always returns an array via select()
  const {
    data: jobsArray,
    isLoading: jobsLoading,
    error: jobsError,
  } = useVendorJobs();

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

            {/* Guard order: loading -> empty -> list */}
            {!jobsLoading && jobsArray.length === 0 ? (
              <div className="text-gray-500">
                No jobs yet. Assign a vendor from a request to create one.
              </div>
            ) : null}

            {!jobsLoading && jobsArray.length > 0 ? (
              <div className="space-y-3">
                {jobsArray.map((j: VendorJob) => (
                  <div
                    key={j.id}
                    className="bg-white rounded-xl border p-4 flex items-start justify-between"
                  >
                    <div className="pr-3">
                      <div className="text-sm text-gray-500">{j.vendorName}</div>
                      <div className="text-base font-medium">{j.title || "Service request"}</div>
                      <div className="text-sm text-gray-500">
                        {j.property ? `${j.property} • ` : ""}
                        {j.category ?? ""} {j.priority ? `• ${j.priority}` : ""}
                      </div>
                      {j.note ? (
                        <div className="text-xs text-gray-500 mt-1 italic">{j.note}</div>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-500">
                      {j.lastActivityAt
                        ? new Date(j.lastActivityAt).toLocaleString()
                        : j.createdAt
                        ? new Date(j.createdAt).toLocaleString()
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}

