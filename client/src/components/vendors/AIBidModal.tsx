// client/src/components/vendors/AIBidModal.tsx
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApproveBid, useRequestBids } from "@/lib/vendors.hooks";

export default function AIBidModal({
  open,
  onOpenChange,
  defaultCategory = "Plumbing",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultCategory?: string;
}) {
  const [category, setCategory] = React.useState<string>(defaultCategory);
  const [desc, setDesc] = React.useState<string>("Replace leaking P-trap under kitchen sink, include parts & labor.");

  const request = useRequestBids();
  const approve = useApproveBid();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Request AI Bids</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Select onValueChange={setCategory} value={category}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {["Plumbing","HVAC","Electrical","General Contractor","Cleaning","Landscaping","Other"].map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Button
            variant="secondary"
            disabled={request.isPending}
            onClick={() => request.mutate({ category: category as any, description: desc })}
          >
            {request.isPending ? "Requesting…" : "Get Bids"}
          </Button>

          {/* Results */}
          {!!request.data?.length && (
            <div className="space-y-2">
              {request.data.map((b) => (
                <div key={b.vendorId} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{b.vendorName}</div>
                    <div className="text-sm">${b.estimate.toFixed(0)}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ETA ~{b.earliestETAHours}h • {b.justification}
                  </div>
                  <div className="mt-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        approve.mutate({ vendorId: b.vendorId }, { onSuccess: () => onOpenChange(false) })
                      }
                    >
                      Approve & Dispatch
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
