import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, ChevronDown, ChevronUp, ArrowRight, RefreshCcw } from "lucide-react";

import Sidebar from "@/components/dashboard/sidebar";
import StatsTiles from "@/components/dashboard/StatsTiles";
import StatsCards from "@/components/dashboard/stats-cards";
import NewRequestForm from "@/components/dashboard/new-request-form";
import AISuggestion from "@/components/dashboard/ai-suggestion";
import RequestsTable from "@/components/dashboard/requests-table";
import CategoryChart from "@/components/dashboard/category-chart";
import SLAAlerts from "@/components/dashboard/sla-alerts";
import TopVendors from "@/components/dashboard/top-vendors";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { useSlaAlerts, useVendors } from "@/lib/hooks";

export default function Dashboard() {
  const navigate = useNavigate();
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [formExpanded, setFormExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: notifications } = useQuery({ queryKey: ["/notifications"] });
  const notificationCount = Array.isArray(notifications) ? notifications.length : 3;

  const { data: slaAlerts, isLoading: slaLoading, refetch: refetchSla } = useSlaAlerts();
  const { data: vendors, isLoading: vendorsLoading } = useVendors();

  const briefQ = useQuery({
    queryKey: ["/agent/daily-brief"],
    queryFn: async () => api<{ ok: boolean; brief: { text: string } }>("/agent/daily-brief"),
    enabled: briefOpen,
  });

  const emailBrief = useMutation({
    mutationFn: async (to: string) =>
      api("/agent/daily-brief/email", { method: "POST", body: { to } }),
  });

  const slaItems = Array.isArray(slaAlerts) ? slaAlerts : [];
  const vendorList = Array.isArray(vendors) ? vendors.slice(0, 3) : [];

  return (
    <div className="flex h-screen bg-gray-50 md:flex-row flex-col">
      <div className="md:block hidden">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile: Logo + Title */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center md:hidden">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <div>
                <h2 className="text-lg md:text-2xl font-semibold text-gray-900">
                  <span className="md:hidden">Parco PM</span>
                  <span className="hidden md:inline">Property Management Dashboard</span>
                </h2>
                <p className="text-xs md:text-base text-gray-500 md:hidden">Agent Dashboard</p>
                <p className="text-sm md:text-base text-gray-600 hidden md:block">
                  Today,&nbsp;
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* Desktop: Daily Brief button */}
              <Button
                variant="outline"
                className="hidden md:inline-flex"
                onClick={() => setBriefOpen(true)}
              >
                Daily Brief
              </Button>

              {/* Bell - goes to urgent issues */}
              <button
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => navigate("/requests?priority=Urgent")}
                data-testid="button-alerts"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Mobile: Hamburger menu -> Settings */}
              <button
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
                onClick={() => setMenuOpen(true)}
                data-testid="button-hamburger"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Desktop: New Request button */}
              <Button
                className="bg-green-700 text-white hover:bg-green-800 transition-colors items-center space-x-2 hidden md:flex"
                onClick={() => navigate("/requests")}
              >
                <span>New Request</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {/* Mobile Layout */}
          <div className="md:hidden space-y-4">
            {/* Stats Tiles - Clickable */}
            <StatsTiles />

            {/* SLA Alerts Section */}
            <div className="bg-white border rounded-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                  SLA Alerts
                </h3>
                <button
                  onClick={() => refetchSla()}
                  className="text-sm text-gray-500 flex items-center gap-1"
                  data-testid="button-refresh-sla"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
              <div className="p-4 space-y-3">
                {slaLoading ? (
                  <div className="text-gray-500 text-sm">Loading...</div>
                ) : slaItems.length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-4">No SLA alerts</div>
                ) : (
                  slaItems.slice(0, 3).map((alert: any) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        alert.priority === "urgent"
                          ? "bg-red-50 border-red-500"
                          : "bg-yellow-50 border-yellow-500"
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {alert.propertyAddress} — {alert.category}
                      </p>
                      <p className="text-xs text-gray-600">
                        SLA expires in <span className="font-medium text-red-600">{alert.hoursLeft}h</span>
                      </p>
                      <button
                        className="text-xs text-green-700 mt-1 flex items-center gap-1"
                        onClick={() => navigate("/requests")}
                      >
                        View Details <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Daily Brief Button */}
            <button
              className="w-full bg-white border rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 transition"
              onClick={() => setBriefOpen(true)}
              data-testid="button-daily-brief"
            >
              <span className="font-medium text-gray-900">Daily Brief</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>

            {/* Submit New Property Issue - Collapsible */}
            <div className="bg-white border rounded-xl overflow-hidden">
              <button
                className="w-full p-4 flex items-center justify-between"
                onClick={() => setFormExpanded(!formExpanded)}
                data-testid="button-toggle-form"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-700 text-lg leading-none">+</span>
                  </div>
                  <span className="font-medium text-gray-900">Submit New Property Issue</span>
                </div>
                {formExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {formExpanded && (
                <div className="px-4 pb-4">
                  <NewRequestForm onSuggestion={setAiSuggestion} />
                </div>
              )}
            </div>

            {aiSuggestion && <AISuggestion suggestion={aiSuggestion} />}

            {/* Top Vendors Section */}
            <div className="bg-white border rounded-xl">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">Top Vendors</h3>
              </div>
              <div className="p-4 space-y-3">
                {vendorsLoading ? (
                  <div className="text-gray-500 text-sm">Loading...</div>
                ) : vendorList.length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-4">No vendors found</div>
                ) : (
                  vendorList.map((vendor: any) => (
                    <div
                      key={vendor.id}
                      className="p-3 bg-gray-50 rounded-lg border-l-4 border-green-500"
                    >
                      <p className="text-sm font-medium text-gray-900">{vendor.name}</p>
                      <p className="text-xs text-gray-600 capitalize">{vendor.trade || vendor.category}</p>
                    </div>
                  ))
                )}
              </div>
              <button
                className="w-full p-3 text-center text-sm text-green-700 font-medium border-t hover:bg-gray-50"
                onClick={() => navigate("/vendors")}
                data-testid="link-view-all-vendors"
              >
                View All Vendors <ArrowRight className="w-4 h-4 inline ml-1" />
              </button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:block">
            <StatsTiles />
            <StatsCards />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-6 md:mt-8">
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <NewRequestForm onSuggestion={setAiSuggestion} />
                {aiSuggestion && <AISuggestion suggestion={aiSuggestion} />}
                <RequestsTable />
              </div>

              <div className="space-y-4 md:space-y-6">
                <Button variant="outline" className="w-full" onClick={() => setBriefOpen(true)}>
                  Daily Brief
                </Button>
                <SLAAlerts />
                <CategoryChart />
                <TopVendors />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Hamburger Menu Sheet (Mobile) */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-64">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            <button
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition"
              onClick={() => {
                setMenuOpen(false);
                navigate("/settings");
              }}
            >
              Settings
            </button>
            <button
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition"
              onClick={() => {
                setMenuOpen(false);
                navigate("/vendors");
              }}
            >
              Vendors
            </button>
            <button
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition"
              onClick={() => {
                setMenuOpen(false);
                navigate("/audit");
              }}
            >
              Audit Log
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Daily Brief Modal */}
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
              <Button variant="outline" onClick={() => briefQ.refetch()}>
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
