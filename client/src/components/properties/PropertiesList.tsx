// client/src/components/properties/PropertiesList.tsx
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProperties as useFilteredProperties } from "@/lib/properties.hooks"; // your original filtered hook
import type { PropertyRow } from "@/types/properties";

type Props = {
  /** Optional rows provided by the page; if present, we prefer these. */
  properties?: PropertyRow[];
  onSelect: (row: PropertyRow) => void;
};

/** Safely split "City, State • Type" or "City, State" style addresses */
function parseAddress(addr?: string | null): { city: string; state: string } {
  if (!addr) return { city: "—", state: "" };
  const cityState = addr.split("•")[0]?.trim() ?? addr;
  const [city = "—", st = "" ] = cityState.split(",").map((s) => s.trim());
  return { city: city || "—", state: st || "" };
}

/** Map a lightweight PropertyRow → the richer table shape your UI expects */
function mapPropRowToDisplay(r: PropertyRow) {
  const { city, state } = parseAddress(r.address ?? "");
  return {
    id: r.id,
    name: r.name,
    city,
    state,
    type: (r as any).type ?? "Multifamily", // fallback; your seed uses Multifamily/Mixed Use
    unitsTotal: (r as any).unitsTotal ?? r.units ?? 0,
    occupancyPct: (r as any).occupancyPct ?? r.occ ?? 0,
    ttmNOI: (r as any).ttmNOI ?? r.noiTtm ?? 0,
    __orig: r, // keep original row for onSelect
  };
}

export default function PropertiesList({ properties: propRows, onSelect }: Props) {
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState<string>("All");
  const [status, setStatus] = React.useState<string>("All");
  const [city, setCity] = React.useState<string>("All");

  // Always call the hook to keep rules intact; we'll prefer propRows if provided
  const { data, isLoading } = useFilteredProperties({ search, type: type as any, status: status as any, city });

  // Build the display rows, preferring the prop rows (so new items show immediately)
  const rows = React.useMemo(() => {
    if (propRows && Array.isArray(propRows)) {
      const mapped = propRows.map(mapPropRowToDisplay);

      // Apply the *same* filters locally so UX matches your hook behavior
      return mapped.filter((r) => {
        const matchesSearch =
          !search ||
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.city.toLowerCase().includes(search.toLowerCase());
        const matchesType = type === "All" || (r.type || "").toLowerCase() === type.toLowerCase();
        const matchesCity = city === "All" || r.city === city;
        // Status doesn’t exist on propRows; treat as pass-through (matches all)
        const matchesStatus = true || status === "All";
        return matchesSearch && matchesType && matchesCity && matchesStatus;
      });
    }

    // Fallback to your original hook shape (expects data?.rows)
    return (data?.rows ?? []).map((r: any) => ({
      ...r,
      __orig: r as PropertyRow,
    }));
  }, [propRows, data?.rows, search, type, city /* status intentionally ignored for propRows */]);

  const loading = propRows ? false : isLoading;

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
              {loading && <tr><td className="p-4" colSpan={5}>Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td className="p-4" colSpan={5}>No properties</td></tr>}

              {!loading && rows.map((r: any) => (
                <tr
                  key={r.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => onSelect(r.__orig ?? r)}
                >
                  <td className="p-3 font-medium">{String(r.id).replace(/^p-/, "")}</td>
                  <td className="p-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.city}{r.state ? `, ${r.state}` : ""}{r.type ? ` • ${r.type}` : ""}
                    </div>
                  </td>
                  <td className="p-3">{r.unitsTotal ?? 0}</td>
                  <td className="p-3">{typeof r.occupancyPct === "number" ? r.occupancyPct : 0}%</td>
                  <td className="p-3">${Math.round((r.ttmNOI ?? 0) / 1000)}k</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
