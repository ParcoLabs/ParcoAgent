// client/src/components/GenerateDraftsButton.tsx
import * as React from "react";
import { useRunAgent } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Props = {
  requestId: string;
};

export default function GenerateDraftsButton({ requestId }: Props) {
  const [mode, setMode] = React.useState<"tenant_update" | "vendor_outreach" | "both">("both");
  const run = useRunAgent();

  return (
    <div className="flex items-center gap-2">
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as any)}
        className="border rounded-md px-2 py-1 text-sm"
      >
        <option value="both">Both</option>
        <option value="tenant_update">Tenant update</option>
        <option value="vendor_outreach">Vendor outreach</option>
      </select>
      <Button
        onClick={() => run.mutate({ requestId, mode })}
        disabled={run.isPending}
        className="bg-green-700 hover:bg-green-800"
      >
        {run.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Generate Drafts
      </Button>
    </div>
  );
}
