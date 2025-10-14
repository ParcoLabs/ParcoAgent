// client/src/components/dashboard/StatsTiles.tsx
import * as React from "react";
import { useQuery } from "@tanstack/react-query";

export default function StatsTiles() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-white border rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-gray-500">Couldn’t load stats</div>;
  }

  const tiles = [
    { label: "Active Requests", value: data.activeRequests },
    { label: "Urgent Issues", value: data.urgentIssues },
    { label: "SLA Compliance", value: `${data.slaCompliance}%` },
    { label: "Avg Resolution", value: `${data.avgResolutionDays}d` },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="bg-white border rounded-xl p-4">
          <div className="text-sm text-gray-500">{t.label}</div>
          <div className="text-2xl font-semibold">{t.value}</div>
        </div>
      ))}
    </div>
  );
}
