// client/src/components/analytics/FiltersBar.tsx
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AnalyticsFilters, GroupBy } from "@/types/analytics";

export default function FiltersBar({
  filters,
  onChange,
}: {
  filters: AnalyticsFilters;
  onChange: (next: AnalyticsFilters) => void;
}) {
  const [from, setFrom] = React.useState(filters.from || "");
  const [to, setTo] = React.useState(filters.to || "");
  const [groupBy, setGroupBy] = React.useState<GroupBy>(filters.groupBy || "month");
  const [propertyId, setPropertyId] = React.useState(filters.propertyId || "All");
  const [category, setCategory] = React.useState(filters.category || "All");
  const [vendorId, setVendorId] = React.useState(filters.vendorId || "All");

  function apply() {
    onChange({
      from: from || undefined,
      to: to || undefined,
      groupBy,
      propertyId: propertyId === "All" ? undefined : propertyId,
      category: category === "All" ? undefined : category,
      vendorId: vendorId === "All" ? undefined : vendorId,
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
      <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
        <SelectTrigger><SelectValue placeholder="Group by" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="week">Week</SelectItem>
          <SelectItem value="month">Month</SelectItem>
          <SelectItem value="quarter">Quarter</SelectItem>
        </SelectContent>
      </Select>
      <Select value={propertyId} onValueChange={setPropertyId}>
        <SelectTrigger><SelectValue placeholder="Property" /></SelectTrigger>
        <SelectContent>
          {["All", "p-225-pine", "p-456-oak", "p-12-maple"].map((p) => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          {["All", "Plumbing", "HVAC", "Electrical", "Cleaning", "Other"].map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Select value={vendorId} onValueChange={setVendorId}>
          <SelectTrigger><SelectValue placeholder="Vendor" /></SelectTrigger>
          <SelectContent>
            {["All", "v-plumbfast", "v-clearflow", "v-hvacpro", "v-sparkelect"].map((v) => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={apply}>Apply</Button>
      </div>
    </div>
  );
}
