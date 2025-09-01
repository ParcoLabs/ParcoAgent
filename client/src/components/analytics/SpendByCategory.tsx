// client/src/components/analytics/SpendByCategory.tsx
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSpendByCategory } from "@/lib/analytics.hooks";
import type { AnalyticsFilters } from "@/types/analytics";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

export default function SpendByCategory({ filters }: { filters: AnalyticsFilters }) {
  const { data } = useSpendByCategory(filters);

  return (
    <Card>
      <CardHeader><CardTitle>Maintenance Spend by Category</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data || []}
              dataKey="value"
              nameKey="label"
              outerRadius={90}
              label
            >
              {(data || []).map((_, idx) => <Cell key={idx} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
