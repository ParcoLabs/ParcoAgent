// client/src/components/properties/PropertyDetailsPane.tsx
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useProperty } from "@/lib/properties.hooks";
import type { PropertyRow } from "@/types/properties";
import { FileText, ShieldAlert, Lightbulb, TrendingUp, FolderPlus } from "lucide-react";
import AIPlanModal from "./AIPlanModal";

export default function PropertyDetailsPane({ selected }: { selected?: PropertyRow | null }) {
  const { data } = useProperty(selected?.id);
  const [openPlan, setOpenPlan] = React.useState(false);

  if (!selected) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Select a property to view details</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{data?.name} ({data?.city})</span>
            <div className="flex gap-2">
              <Badge variant="secondary">{data?.type}</Badge>
              <Badge variant="outline">{data?.status}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Class</div>
            <div className="font-medium">{data?.class}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Year Built</div>
            <div className="font-medium">{data?.yearBuilt}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Owner</div>
            <div className="font-medium">{data?.owner}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Units / Occupancy</div>
            <div className="font-medium">{data?.unitsTotal} • {data?.occupancyPct}%</div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lightbulb className="w-4 h-4" />AI Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data?.insights?.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>{s}</span>
            </div>
          ))}
          <Button className="mt-2" onClick={() => setOpenPlan(true)}>Apply Plan</Button>
        </CardContent>
      </Card>

      {/* Financial Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />Financial Health</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <Metric label="Occupancy" value={`${data?.occupancyPct}%`} />
          <Metric label="Average Rent" value={`$${data?.avgRent?.toLocaleString()}`} />
          <Metric label="Cap Rate" value={`${data?.capRate}%`} />
          <Metric label="TTM NOI" value={`$${(data?.ttmNOI ?? 0).toLocaleString()}`} />
          <div className="col-span-2">
            <div className="text-muted-foreground mb-1">Top Costs</div>
            <div className="flex gap-2 text-xs">
              <Badge variant="secondary">Repairs {data?.expenseBreakdown.repairsPct}%</Badge>
              <Badge variant="secondary">Utilities {data?.expenseBreakdown.utilitiesPct}%</Badge>
              <Badge variant="secondary">Mgmt {data?.expenseBreakdown.managementPct}%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Radar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="w-4 h-4" />Compliance Radar</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <Row label="Insurance expiring" value={data?.compliance?.insuranceExpiresInDays ? `${data?.compliance?.insuranceExpiresInDays} days` : "—"} />
          <Row label="Missing vendor COIs" value={String(data?.compliance?.missingVendorCOIs ?? 0)} />
          <Row label="Lease renewals (30d)" value={String(data?.compliance?.renewalsDueNext30 ?? 0)} />
          <Button variant="outline" size="sm">Fix Now</Button>
        </CardContent>
      </Card>

      {/* Tenant Sentiment / Issue Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Sentiment & Issues</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {data?.trends?.map((t, i) => (<div key={i}>• {t}</div>))}
          <Button variant="outline" size="sm">Open Requests</Button>
        </CardContent>
      </Card>

      {/* Units */}
      <Card>
        <CardHeader><CardTitle>Units</CardTitle></CardHeader>
        <CardContent>
          <div className="max-h-48 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-muted-foreground">
                  <th className="text-left p-2">Unit</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Rent</th>
                  <th className="text-left p-2">Beds/Baths</th>
                </tr>
              </thead>
              <tbody>
                {data?.units?.map((u) => (
                  <tr key={u.number} className="border-t">
                    <td className="p-2">{u.number}</td>
                    <td className="p-2"><Badge variant={u.status === "Vacant" ? "destructive" : "secondary"}>{u.status}</Badge></td>
                    <td className="p-2">${u.rent.toLocaleString()}</td>
                    <td className="p-2">{u.beds ?? "—"}/{u.baths ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4" />Documents</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data?.docs?.map((d) => (<div key={d.id}>• {d.name}</div>))}
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><FolderPlus className="w-4 h-4 mr-1" />Upload</Button>
            <Button variant="secondary" size="sm">Ask AI: “renewal date?”</Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline">Edit</Button>
          <Button variant="outline">Archive</Button>
          <Button>New Request</Button>
        </CardContent>
      </Card>

      <AIPlanModal open={openPlan} onOpenChange={setOpenPlan} propertyId={selected.id} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
