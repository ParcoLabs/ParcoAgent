// client/src/pages/analytics.tsx
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

import Sidebar from "@/components/dashboard/sidebar";
import FiltersBar from "@/components/analytics/FiltersBar";
import KPIStrip from "@/components/analytics/KPIStrip";
import TrendCard from "@/components/analytics/TrendCard";
import SpendByCategory from "@/components/analytics/SpendByCategory";
import BacklogAging from "@/components/analytics/BacklogAging";
import VendorPerformance from "@/components/analytics/VendorPerformance";
import AIInsights from "@/components/analytics/AIInsights";
import type { AnalyticsFilters } from "@/types/analytics";

export default function AnalyticsPage() {
  // default filters: current quarter (simple)
  const [filters, setFilters] = React.useState<AnalyticsFilters>({
    groupBy: "month",
  });

  // match header behavior from dashboard
  const { data: notifications } = useQuery({ queryKey: ["/api/notifications"] });
  const notificationCount = Array.isArray(notifications) ? notifications.length : 3;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Filters */}
          <FiltersBar filters={filters} onChange={setFilters} />

          {/* KPI strip */}
          <KPIStrip filters={filters} />

          {/* Grid */}
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
