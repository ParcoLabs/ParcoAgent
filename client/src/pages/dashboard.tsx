// client/src/pages/dashboard.tsx
import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Plus } from "lucide-react";

import Sidebar from "@/components/dashboard/sidebar";
import StatsTiles from "@/components/dashboard/StatsTiles";
import StatsCards from "@/components/dashboard/stats-cards";
import NewRequestForm from "@/components/dashboard/new-request-form";
import AISuggestion from "@/components/dashboard/ai-suggestion";
import RequestsTable from "@/components/dashboard/requests-table";
import SLAAlerts from "@/components/dashboard/sla-alerts";
import CategoryChart from "@/components/dashboard/category-chart";
import TopVendors from "@/components/dashboard/top-vendors";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api"; // uses your existing /lib/api helper

export default function Dashboard() {
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [briefOpen, setBriefOpen] = useState(false);

  // Notifications (badge)
  const { data: notifications } = useQuery({
    queryKey: ["/notifications"],
  });
  const notificationCount = Array.isArray(notifications) ? notifications.length : 3;

  // Daily Brief (fetch only when modal opened)
  const briefQ = useQuery({
    queryKey: ["/agent/daily-brief"],
    queryFn: async () => api<{ ok: boolean; brief: { text: string } }>("/agent/daily-brief"),
    enabled: briefOpen,
  });

  // Email the brief
  const emailBrief = useMutation({
    mutationFn: async (to: string) =>
      api("/agent/daily-brief/email", { method: "POST", body: { to } }),
  });

  return (
    <div className="flex h-screen bg-gray-50 md:flex-row flex-col">
      <div className="md:block hidden">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                Property Management Dashboard
              </h2>
              <p className="text-sm md:text-base text-gray-600 hidden sm:block">
                Today,&nbsp;
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <Button
                variant="outline"
                className="hidden sm:inline-flex"
                onClick={() => setBriefOpen(true)}
              >
                Daily Brief
              </Button>

              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>

              <Button
                className="bg-green-700 text-white hover:bg-green-800 transition-colors flex items-center space-x-2"
                onClick={() => (window.location.href = "/requests")}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Request</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {/* ✅ Stats from /dashboard/stats */}
          <StatsTiles />

          {/* ✅ Existing cards & sections */}
          <StatsCards />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-6 md:mt-8">
            {/* Recent Requests & AI Suggestions */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              <NewRequestForm onSuggestion={setAiSuggestion} />
              {aiSuggestion && <AISuggestion suggestion={aiSuggestion} />}
              <RequestsTable />
            </div>

            {/* Sidebar Widgets */}
            <div className="space-y-4 md:space-y-6">
              <div className="block sm:hidden">
                <Button variant="outline" className="w-full" onClick={() => setBriefOpen(true)}>
                  Daily Brief
                </Button>
              </div>
              <SLAAlerts />
              <CategoryChart />
              <TopVendors />
            </div>
          </div>
        </main>
      </div>

      {/* Daily Brief Modal (inline, minimal deps) */}
      {briefOpen && (
        <Modal onClose={() => setBriefOpen(false)} title="Daily Brief">
          <div className="h-64 overflow-auto whitespace-pre-wrap text-sm bg-slate-50 border rounded-xl p-3">
            {briefQ.isLoading ? "Generating…" : briefQ.data?.brief?.text || "No data."}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Generated at {new Date().toLocaleTimeString()}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  // re-run Query
                  briefQ.refetch();
                }}
              >
                Refresh
              </Button>
              <Button
                onClick={() => {
                  const to =
                    window.prompt("Send to email:", "operations@parcolabs.com")?.trim() || "";
                  if (!to) return;
                  emailBrief.mutate(to, {
                    onSuccess: () => alert("Brief emailed."),
                    onError: (e: any) => alert(`Failed: ${e?.message || "error"}`),
                  });
                }}
                disabled={emailBrief.isPending}
              >
                {emailBrief.isPending ? "Sending…" : "Email me this brief"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ----------------------------- Local Modal ------------------------------ */
function Modal({
  children,
  title,
  onClose,
}: {
  children: React.ReactNode;
  title?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-[92vw] max-w-2xl p-5 shadow-xl border">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">{title}</div>
          <button className="text-slate-500 hover:text-slate-800" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
