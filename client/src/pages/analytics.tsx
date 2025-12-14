import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

import Sidebar from "@/components/dashboard/sidebar";
// REPLACED FiltersBar with inline version to control order/labels precisely
import KPIStrip from "@/components/analytics/KPIStrip";
import TrendCard from "@/components/analytics/TrendCard";
import SpendByCategory from "@/components/analytics/SpendByCategory";
import BacklogAging from "@/components/analytics/BacklogAging";
import VendorPerformance from "@/components/analytics/VendorPerformance";
import AIInsights from "@/components/analytics/AIInsights";
import type { AnalyticsFilters } from "@/types/analytics";

type Opt = { value: string; label: string };

const ALL: Opt = { value: "all", label: "All" };

function InlineFilters({
  filters,
  onChange,
}: {
  filters: AnalyticsFilters & {
    property?: string;
    requestType?: string;
    vendor?: string;
  };
  onChange: (f: any) => void;
}) {
  const propertyOptions: Opt[] = [
    ALL,
    { value: "225-pine", label: "225 Pine St" },
    { value: "456-oak", label: "456 Oak Ave" },
    { value: "12-maple", label: "12 Maple Ct" },
  ];
  const requestTypeOptions: Opt[] = [
    ALL,
    { value: "Plumbing", label: "Plumbing" },
    { value: "Electrical", label: "Electrical" },
    { value: "HVAC", label: "HVAC" },
    { value: "Noise", label: "Noise" },
    { value: "Other", label: "Other" },
  ];
  const vendorOptions: Opt[] = [
    ALL,
    { value: "V001", label: "AquaFix Pro" },
    { value: "V002", label: "CoolAir Masters" },
    { value: "V003", label: "Bright Electric" },
  ];

  return (
    <div className="rounded-2xl border bg-white p-3 md:p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Property (FIRST) */}
        <label className="text-sm">
          <span className="block text-[12px] text-gray-600 mb-1">Property</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={filters.property ?? "all"}
            onChange={(e) => onChange({ ...filters, property: e.target.value })}
          >
            {propertyOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* Request Type */}
        <label className="text-sm">
          <span className="block text-[12px] text-gray-600 mb-1">Request Type</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={filters.requestType ?? "all"}
            onChange={(e) => onChange({ ...filters, requestType: e.target.value })}
          >
            {requestTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* Vendor */}
        <label className="text-sm">
          <span className="block text-[12px] text-gray-600 mb-1">Vendor</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={filters.vendor ?? "all"}
            onChange={(e) => onChange({ ...filters, vendor: e.target.value })}
          >
            {vendorOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* Group by */}
        <label className="text-sm">
          <span className="block text-[12px] text-gray-600 mb-1">Group by</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={filters.groupBy ?? "month"}
            onChange={(e) => onChange({ ...filters, groupBy: e.target.value })}
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  // default filters: current quarter (simple)
  const [filters, setFilters] = React.useState<AnalyticsFilters & { property?: string; requestType?: string; vendor?: string }>({
    groupBy: "month",
    property: "all",
    requestType: "all",
    vendor: "all",
  });

  // match header behavior from dashboard
  const { data: notifications } = useQuery({ queryKey: ["/api/notifications"] });
  const notificationCount = Array.isArray(notifications) ? notifications.length : 3;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-screen bg-gray-50 md:flex-row flex-col">
      {/* Sidebar */}
      <div className="md:block hidden">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Analytics</h2>
              <p className="text-sm md:text-base text-gray-600 hidden sm:block">Today, {today}</p>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
              <Button variant="outline">Export</Button>
            </div>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 space-y-6">
          {/* Filters (Property first, labeled) */}
          <InlineFilters filters={filters} onChange={setFilters} />

          {/* KPI strip */}
          <KPIStrip filters={filters} />

          {/* Grid — focus on the high-value charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Left column (2 cols wide) */}
            <div className="xl:col-span-2 space-y-4">
              <TrendCard filters={filters} />
              <BacklogAging filters={filters} />
              <VendorPerformance filters={filters} />
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <SpendByCategory filters={filters} />
              <AIInsights filters={filters} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
