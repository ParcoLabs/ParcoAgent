// client/src/components/requests/AssignVendorModal.tsx
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useVendors, useAssignVendor } from "@/lib/hooks";
// ✅ Fix: use the correct alias "@/…" (not "@components/…")
import { useToast } from "@/components/ui/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string;
  category?: string;
};

export default function AssignVendorModal({
  open,
  onOpenChange,
  requestId,
  category,
}: Props) {
  const { data: vendors = [], isLoading } = useVendors();
  const [vendorId, setVendorId] = React.useState<string>("");
  const { mutateAsync: assign, isPending } = useAssignVendor();
  const { toast } = useToast();

  React.useEffect(() => {
    setVendorId("");
  }, [open, requestId]);

  const filtered =
    vendors.filter((v) =>
      category
        ? (v.category || "").toLowerCase() === category.toLowerCase()
        : true
    ) || vendors;

  async function onAssign() {
    if (!vendorId) {
      toast({
        title: "Pick a vendor",
        description: "Select a vendor from the list.",
        variant: "destructive",
      });
      return;
    }
    await assign({ requestId, vendorId });
    toast({ title: "Vendor assigned" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign vendor</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Select value={vendorId} onValueChange={setVendorId}>
            <SelectTrigger>
              <SelectValue
                placeholder={isLoading ? "Loading..." : "Select a vendor"}
              />
            </SelectTrigger>
            <SelectContent>
              {(filtered.length ? filtered : vendors).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} {v.category ? `• ${v.category}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onAssign} disabled={isPending || !vendorId}>
              {isPending ? "Assigning…" : "Assign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
