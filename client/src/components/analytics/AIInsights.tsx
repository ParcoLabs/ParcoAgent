// client/src/components/analytics/AIInsights.tsx
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInsights } from "@/lib/analytics.hooks";
import type { AnalyticsFilters } from "@/types/analytics";

export default function AIInsights({ filters }: { filters: AnalyticsFilters }) {
  const { data, refetch, isFetching } = useInsights(filters);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI Insights</CardTitle>
        <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {data?.bullets?.map((b, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-1">•</span>
            <span>{b}</span>
          </div>
        ))}
        <div className="pt-2 flex gap-2">
          <Button size="sm">Open Requests</Button>
          <Button size="sm" variant="outline">Request Bids</Button>
          <Button size="sm" variant="outline">Fix Compliance</Button>
        </div>
      </CardContent>
    </Card>
  );
}
