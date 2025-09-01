// client/src/components/analytics/TrendCard.tsx
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRequestTrends } from "@/lib/analytics.hooks";
import type { AnalyticsFilters } from "@/types/analytics";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export default function TrendCard({ filters }: { filters: AnalyticsFilters }) {
  const { data } = useRequestTrends(filters);

  return (
    <Card>
      <CardHeader><CardTitle>Requests Trend (Volume vs Late)</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data || []} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="y" name="Total" fillOpacity={0.3} />
            <Area type="monotone" dataKey="y2" name="Late" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
