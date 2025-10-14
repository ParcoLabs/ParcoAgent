import * as React from "react";
import { useRunAgent } from "@/lib/hooks";
import { Button } from "@/components/ui/button";

export default function ReachOutButton({ requestId }: { requestId: string }) {
  const run = useRunAgent?.();

  // Fallback to a no-op if hooks not present in older code
  if (!run) {
    return (
      <Button
        variant="outline"
        onClick={() =>
          fetch("/api/agent/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId, mode: "vendor_outreach" }),
          })
        }
      >
        Reach Out to Vendor
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() => run.mutate({ requestId, mode: "vendor_outreach" })}
      disabled={run.isPending}
    >
      {run.isPending ? "Creating outreach…" : "Reach Out to Vendor"}
    </Button>
  );
}
