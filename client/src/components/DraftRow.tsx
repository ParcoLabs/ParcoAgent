// client/src/components/DraftRow.tsx
import * as React from "react";
import type { Draft } from "@/lib/api";
import { useApproveDraft } from "@/lib/hooks";

export function DraftRow({ d }: { d: Draft }) {
  const approve = useApproveDraft();

  const isDraft = d.status === "DRAFT" || d.status === "PENDING";
  const sending = approve.isPending;

  return (
    <div className="flex items-start justify-between border-b py-3">
      <div className="max-w-[70%]">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          {d.kind ?? "message"} • {String(d.channel).toLowerCase()}
        </div>
        {d.subject ? <div className="font-medium">{d.subject}</div> : null}
        <pre className="whitespace-pre-wrap text-sm text-gray-800">{d.body}</pre>
        <div className="text-xs mt-1 text-gray-500">to: {d.to}</div>
        <div className="text-xs mt-1">
          status:{" "}
          <span
            className={
              d.status === "SENT"
                ? "text-green-600"
                : d.status === "FAILED"
                ? "text-red-600"
                : "text-gray-700"
            }
          >
            {d.status}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="px-3 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50"
          onClick={() => approve.mutate(d.id)}
          disabled={!isDraft || sending}
          title={isDraft ? "Approve & send this draft" : "Already processed"}
        >
          {sending ? "Sending..." : isDraft ? "Approve & Send" : "Sent"}
        </button>
      </div>
    </div>
  );
}
