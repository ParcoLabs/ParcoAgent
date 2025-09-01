// client/src/components/requests/AssignVendorModal.tsx
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAssignVendor, useVendors } from "@/lib/requests.hooks";
import type { Category, Vendor } from "@/types/requests";

export type AssignVendorModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string;
  category?: Category;
};

export default function AssignVendorModal({
  open,
  onOpenChange,
  requestId,
  category,
}: AssignVendorModalProps) {
  const { data } = useVendors(category);
  const assign = useAssignVendor();
  const [selected, setSelected] = React.useState<Vendor | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Assign Vendor</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {data?.map((v) => (
            <button
              key={v.id}
              className={`w-full text-left p-3 rounded-lg border hover:bg-muted ${
                selected?.id === v.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelected(v)}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{v.name}</div>
                <div className="flex gap-2 items-center">
                  {v.preferred && <Badge>Preferred</Badge>}
                  {typeof v.rating === "number" && (
                    <Badge variant="secondary">{v.rating.toFixed(1)}★</Badge>
                  )}
                  {typeof v.etaMinutes === "number" && (
                    <Badge variant="outline">
                      ETA ~{Math.round(v.etaMinutes / 60)}h
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Category: {v.category} • {v.email ?? v.phone}
              </div>
            </button>
          ))}
          {!data?.length && (
            <div className="text-sm text-muted-foreground">
              No vendors found for this category.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected || assign.isPending}
            onClick={() =>
              selected &&
              assign.mutate(
                { requestId, vendorId: selected.id },
                { onSuccess: () => onOpenChange(false) }
              )
            }
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
