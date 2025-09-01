// client/src/components/vendors/VendorsList.tsx
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useVendors } from "@/lib/vendors.hooks";
import type { VendorRow } from "@/types/vendors";

export default function VendorsList({ onSelect }: { onSelect: (row: VendorRow) => void }) {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>("All");
  const [status, setStatus] = React.useState<string>("All");
  const [compliance, setCompliance] = React.useState<string>("All");
  const [minRating, setMinRating] = React.useState<string>("All");

  const { data, isLoading } = useVendors({
    search,
    category: category as any,
    status: status as any,
    compliance: compliance as any,
    minRating: minRating === "All" ? undefined : Number(minRating),
  });

  return (
    <Card className="h-full">
      <CardHeader className="gap-3">
        <CardTitle className="text-lg">Vendors</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <Input placeholder="Search vendors…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select onValueChange={setCategory} value={category}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {["All","Plumbing","HVAC","Electrical","General Contractor","Cleaning","Landscaping","Other"].map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setStatus} value={status}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {["All","Active","Inactive","Probation"].map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setCompliance} value={compliance}>
            <SelectTrigger><SelectValue placeholder="Compliance" /></SelectTrigger>
            <SelectContent>
              {["All","Compliant","At Risk"].map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setMinRating} value={minRating}>
            <SelectTrigger><SelectValue placeholder="Min Rating" /></SelectTrigger>
            <SelectContent>
              {["All","4.0","4.2","4.5","4.7"].map(v => (
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
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Jobs</th>
                <th className="text-left p-3">Rating</th>
                <th className="text-left p-3">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td className="p-4" colSpan={5}>Loading…</td></tr>}
              {!isLoading && data?.rows?.length === 0 && <tr><td className="p-4" colSpan={5}>No vendors</td></tr>}
              {data?.rows?.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => onSelect(r)}>
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3">{r.category}</td>
                  <td className="p-3">{r.jobsYTD}</td>
                  <td className="p-3">{r.rating.toFixed(1)}★</td>
                  <td className="p-3">
                    <Badge variant={r.compliant ? "secondary" : "destructive"}>
                      {r.compliant ? "COI / Licenses OK" : "At Risk"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
