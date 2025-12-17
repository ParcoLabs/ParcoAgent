import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ClipboardList, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

export default function StatsTiles() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery<{
    activeRequests: number;
    urgentIssues: number;
    slaCompliance: number;
    avgResolutionDays: number;
  }>({
    queryKey: ["/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-white border rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-gray-500">Couldn't load stats</div>;
  }

  const tiles = [
    {
      label: "Active Requests",
      value: data.activeRequests,
      change: "+12% from last month",
      changePositive: true,
      icon: ClipboardList,
      onClick: () => navigate("/requests"),
      testId: "stat-active-requests",
    },
    {
      label: "Urgent Issues",
      value: data.urgentIssues,
      change: `+ ${data.urgentIssues} new today`,
      changePositive: false,
      icon: AlertTriangle,
      onClick: () => navigate("/requests?priority=Urgent"),
      testId: "stat-urgent-issues",
    },
    {
      label: "Avg Resolution",
      value: `${data.avgResolutionDays}d`,
      icon: Clock,
      testId: "stat-avg-resolution",
    },
    {
      label: "SLA Compliance",
      value: `${data.slaCompliance}%`,
      icon: CheckCircle2,
      testId: "stat-sla-compliance",
    },
  ];

  return (
    <>
      {/* Mobile: vertical stack */}
      <div className="space-y-3 md:hidden">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={`bg-white border rounded-xl p-4 flex items-center justify-between ${
              t.onClick ? "cursor-pointer hover:border-green-300 hover:shadow-sm transition-all" : ""
            }`}
            onClick={t.onClick}
            data-testid={t.testId}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <t.icon className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">{t.label}</div>
                <div className="text-2xl font-semibold">{t.value}</div>
              </div>
            </div>
            {t.change && (
              <div className={`text-xs ${t.changePositive ? "text-green-600" : "text-red-500"}`}>
                {t.change}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: horizontal grid */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={`bg-white border rounded-xl p-4 ${
              t.onClick ? "cursor-pointer hover:border-green-300 hover:shadow-sm transition-all" : ""
            }`}
            onClick={t.onClick}
            data-testid={`${t.testId}-desktop`}
          >
            <div className="text-sm text-gray-500">{t.label}</div>
            <div className="text-2xl font-semibold">{t.value}</div>
            {t.change && (
              <div className={`text-xs mt-1 ${t.changePositive ? "text-green-600" : "text-red-500"}`}>
                {t.change}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
