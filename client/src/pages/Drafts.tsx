// client/src/pages/drafts.tsx
import * as React from "react";
import { useDrafts } from "@/lib/hooks";
import { DraftRow } from "@/components/DraftRow";
import Sidebar from "@/components/dashboard/sidebar";

export default function DraftsPage() {
  const { data, isLoading, error } = useDrafts();

  return (
    <div className="flex h-screen bg-gray-50 md:flex-row flex-col">
      <div className="md:block hidden">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Drafts</h2>
          <p className="text-sm text-gray-600">Approve and send tenant/vendor messages.</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {isLoading && <div className="text-gray-500">Loading drafts…</div>}
          {error && <div className="text-red-600">Failed to load drafts.</div>}
          {!isLoading && !error && (!data || data.length === 0) && (
            <div className="text-gray-500">No drafts yet. Generate from a request first.</div>
          )}
          <div className="bg-white rounded-xl border">
            {Array.isArray(data) && data.map((d) => <DraftRow key={d.id} d={d as any} />)}
          </div>
        </main>
      </div>
    </div>
  );
}
