// client/src/components/properties/PropertiesList.tsx
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProperties } from "@/lib/properties.hooks";
import type { PropertyRow } from "@/types/properties";

export default function PropertiesList({ onSelect }: { onSelect: (row: PropertyRow) => void }) {
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState<string>("All");
  const [status, setStatus] = React.useState<string>("All");
  const [city, setCity] = React.useState<string>("All");

  const { data, isLoading } = useProperties({ search, type: type as any, status: status as any, city });

  return (
    <Card className="h-full">
      <CardHeader className="gap-3">
        <CardTitle className="text-lg">Properties</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Input placeholder="Search properties…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select onValueChange={setType} value={type}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              {["All", "Multifamily", "Single Family", "Mixed Use", "Retail", "Office"].map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setStatus} value={status}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {["All", "Active", "Under Review", "Archived"].map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setCity} value={city}>
            <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>
              {["All", "San Francisco", "Austin", "Miami"].map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white shadow-sm">
              <tr className="text-muted-foreground">
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Property</th>
                <th className="text-left p-3">Units</th>
                <th className="text-left p-3">Occ</th>
                <th className="text-left p-3">NOI (TTM)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td className="p-4" colSpan={5}>Loading…</td></tr>}
              {!isLoading && data?.rows?.length === 0 && <tr><td className="p-4" colSpan={5}>No properties</td></tr>}
              {data?.rows?.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => onSelect(r)}>
                  <td className="p-3 font-medium">{r.id.replace("p-","")}</td>
                  <td className="p-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.city}, {r.state} • {r.type}</div>
                  </td>
                  <td className="p-3">{r.unitsTotal}</td>
                  <td className="p-3">{r.occupancyPct}%</td>
                  <td className="p-3">${Math.round(r.ttmNOI/1000)}k</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
