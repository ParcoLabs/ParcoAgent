// client/src/pages/vendors.tsx
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/dashboard/sidebar";
import { api } from "@/lib/api";

type Vendor = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
};

export default function VendorsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/vendors"],
    queryFn: () => api<Vendor[]>("/vendors"),
  });

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
          <p className="text-sm text-gray-600">Directory of service partners.</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {isLoading && <div className="text-gray-500">Loading vendors…</div>}
          {error && <div className="text-red-600">Failed to load vendors.</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(data ?? []).map((v) => (
              <div key={v.id} className="bg-white rounded-xl border p-4">
                <div className="text-lg font-semibold">{v.name}</div>
                <div className="text-sm text-gray-500 capitalize">{v.category || "general"}</div>
                <div className="mt-2 text-sm">
                  {v.email ? <div>Email: <a className="text-blue-600" href={`mailto:${v.email}`}>{v.email}</a></div> : null}
                  {v.phone ? <div>Phone: <a className="text-blue-600" href={`tel:${v.phone}`}>{v.phone}</a></div> : null}
                </div>
              </div>
            ))}
          </div>

          {!isLoading && !error && (data?.length ?? 0) === 0 ? (
            <div className="text-gray-500">No vendors yet.</div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
