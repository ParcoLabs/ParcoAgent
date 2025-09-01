// client/src/components/analytics/VendorPerformance.tsx
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVendorPerformance } from "@/lib/analytics.hook";
import type { AnalyticsFilters } from "@/types/analytics";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function VendorPerformance({ filters }: { filters: AnalyticsFilters }) {
  const { data } = useVendorPerformance(filters);

  const chartData = (data || []).map((d) => ({
    name: d.vendorName,
    onTimePct: d.onTimePct,
    avgCost: d.avgCost,
  }));

  return (
    <Card>
      <CardHeader><CardTitle>Vendor Performance (On-time % vs Avg Cost)</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 0, right: 12 }}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="onTimePct" name="On-time %" />
            <Bar dataKey="avgCost" name="Avg Cost ($)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
