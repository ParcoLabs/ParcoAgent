// client/src/components/GenerateDraftsButton.tsx
import React from "react";
import { useRunAgent } from "@/lib/hooks";

export default function GenerateDraftsButton({ requestId }: { requestId: string }) {
  const runAgent = useRunAgent();

  return (
    <button
      className="px-3 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800 disabled:opacity-50"
      onClick={() => runAgent.mutate({ requestId, mode: "both" })}
      disabled={runAgent.isPending}
    >
      {runAgent.isPending ? "Generating..." : "Generate Drafts"}
    </button>
  );
}
