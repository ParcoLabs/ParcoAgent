// client/src/components/properties/AIPlanModal.tsx
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useApplyPlan, useSuggestPlans } from "@/lib/properties.hooks";

export default function AIPlanModal({ open, onOpenChange, propertyId }: { open: boolean; onOpenChange: (v: boolean) => void; propertyId: string; }) {
  const suggest = useSuggestPlans();
  const apply = useApplyPlan();
  const [plan, setPlan] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setPlan("");
    suggest.mutate(propertyId, { onSuccess: (plans) => setPlan(plans[0] ?? "") });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, propertyId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply AI Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea rows={8} value={plan} onChange={(e) => setPlan(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => suggest.mutate(propertyId, { onSuccess: (p) => setPlan(p[0] ?? "") })}>Regenerate</Button>
          <Button disabled={apply.isPending} onClick={() => apply.mutate({} as any, { onSuccess: () => onOpenChange(false) })}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
