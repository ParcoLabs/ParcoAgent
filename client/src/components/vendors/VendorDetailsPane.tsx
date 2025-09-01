// client/src/components/vendors/VendorDetailsPane.tsx
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRequestComplianceDocs, useVendor, useApproveInvoice, useDisputeInvoice } from "@/lib/vendors.hooks";
import type { VendorRow } from "@/types/vendors";
import { FileWarning, Scale, ShieldCheck, Wrench, Mail } from "lucide-react";
import AIBidModal from "./AIBidModal";

export default function VendorDetailsPane({ selected }: { selected?: VendorRow | null }) {
  const { data } = useVendor(selected?.id);
  const reqCompliance = useRequestComplianceDocs();
  const approveInvoice = useApproveInvoice();
  const disputeInvoice = useDisputeInvoice();
  const [bidOpen, setBidOpen] = React.useState(false);

  if (!selected) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Select a vendor to view details</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{data?.name}</span>
            <div className="flex gap-2">
              <Badge variant="secondary">{data?.category}</Badge>
              <Badge variant="outline">{data?.status}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm grid grid-cols-2 gap-4">
          <Row label="Rating" value={`${data?.rating.toFixed(1)}★`} />
          <Row label="Jobs (YTD)" value={String(data?.jobsYTD ?? 0)} />
          <Row label="Phone" value={data?.phone ?? "—"} />
          <Row label="Email" value={data?.email ?? "—"} />
          <div className="col-span-2 text-muted-foreground">{data?.notes ?? ""}</div>
        </CardContent>
      </Card>

      {/* AI Insights & Bidding */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="w-4 h-4" />AI Insights</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data?.insights?.map((s, i) => <div key={i}>• {s}</div>)}
          <Button className="mt-2" onClick={() => setBidOpen(true)}>Request Bids</Button>
        </CardContent>
      </Card>

      {/* Performance */}
      <Card>
        <CardHeader><CardTitle>Jobs & Performance</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <Row label="On-time" value={`${data?.performance.onTimePct}%`} />
          <Row label="Avg Response" value={`${data?.performance.avgResponseHours}h`} />
          <Row label="Tenant Satisfaction" value={`${data?.performance.tenantSatisfaction.toFixed(1)}/5`} />
          <Row label="Call-backs (YTD)" value={String(data?.performance.callbacksYTD)} />
          <Row label="Avg Job Cost" value={`$${(data?.performance.avgJobCost ?? 0).toFixed(0)}`} />
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Compliance Radar</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="COI Expires" value={data?.compliance?.coiExpiresInDays ? `${data?.compliance?.coiExpiresInDays} days` : "—"} />
          <Row label="W-9 on file" value={data?.compliance?.hasW9 ? "Yes" : "No"} />
          <div>
            <div className="text-muted-foreground mb-1">Licenses</div>
            <ul className="text-sm">
              {data?.compliance?.licenses?.map((l, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Badge variant="secondary">{l.type}</Badge>
                  <span className="text-muted-foreground">exp {new Date(l.expires).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reqCompliance.mutate(selected.id)}
          >
            <Mail className="w-4 h-4 mr-1" />
            Request Docs
          </Button>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Scale className="w-4 h-4" />Invoices & Payment</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data?.invoices?.length ? data.invoices.map((inv) => (
            <div key={inv.invoiceId} className="border rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">Invoice {inv.invoiceId}</div>
                <div>${inv.amount.toFixed(0)}</div>
              </div>
              <div className="text-muted-foreground">
                Bid: ${inv.bidAmount?.toFixed(0) ?? "—"} {typeof inv.delta === "number" && ` • Δ $${inv.delta.toFixed(0)}`}
              </div>
              {inv.reason && (
                <div className="flex items-center gap-2 text-amber-600 mt-1">
                  <FileWarning className="w-4 h-4" /> {inv.reason}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => approveInvoice.mutate(inv.invoiceId)}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => disputeInvoice.mutate(inv.invoiceId)}>Dispute</Button>
              </div>
            </div>
          )) : <div className="text-sm text-muted-foreground">No invoices.</div>}
        </CardContent>
      </Card>

      <AIBidModal open={bidOpen} onOpenChange={setBidOpen} defaultCategory={selected.category} />
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
