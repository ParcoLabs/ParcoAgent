// client/src/components/analytics/KpiStrip.tsx
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useKPIs } from "@/lib/analytics.hook";
import type { AnalyticsFilters } from "@/types/analytics";

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function KpiStrip({ filters }: { filters: AnalyticsFilters }) {
  const { data } = useKPIs(filters);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      <Kpi label="Occupancy" value={`${data?.occupancyPct ?? 0}%`} />
      <Kpi label="Avg Rent" value={`$${(data?.avgRent ?? 0).toLocaleString()}`} />
      <Kpi label="Cap Rate" value={`${data?.capRate ?? 0}%`} />
      <Kpi label="TTM NOI" value={`$${(data?.ttmNOI ?? 0).toLocaleString()}`} />

      <Kpi label="SLA Hit Rate" value={`${data?.slaHitPct ?? 0}%`} />
      <Kpi label="Avg Response" value={`${data?.avgResponseHrs ?? 0}h`} />
      <Kpi label="Cost / Work Order" value={`$${(data?.costPerWO ?? 0).toFixed(0)}`} />
      <Kpi label="Vendor Compliance" value={`${data?.compliancePct ?? 0}%`} sub={`7d>${data?.backlog7 ?? 0} • 30d>${data?.backlog30 ?? 0}`} />
    </div>
  );
}
