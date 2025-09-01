// client/src/components/analytics/BacklogAging.tsx
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBacklogAging } from "@/lib/analytics.hooks";
import type { AnalyticsFilters } from "@/types/analytics";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function BacklogAging({ filters }: { filters: AnalyticsFilters }) {
  const { data } = useBacklogAging(filters);

  return (
    <Card>
      <CardHeader><CardTitle>Backlog Aging</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data || []} margin={{ left: 0, right: 12 }}>
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="y" name="Open Requests" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
