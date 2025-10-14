// client/src/components/requests/AssignVendorPanel.tsx
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useVendors, useAssignVendor } from "@/lib/hooks";

type Props = {
  requestId: string;
  category?: string | null;
};

export default function AssignVendorPanel({ requestId, category }: Props) {
  const { data: vendors, isLoading } = useVendors();
  const [vendorId, setVendorId] = React.useState<string>("");
  const [note, setNote] = React.useState<string>("");

  const assign = useAssignVendor();

  React.useEffect(() => {
    // Pre-select a vendor that matches the category if possible
    if (!vendors || vendors.length === 0) return;
    if (vendorId) return;
    const match =
      vendors.find((v: any) =>
        (v.category || v.trade || "").toLowerCase() === (category || "").toLowerCase()
      ) || vendors[0];
    setVendorId(match?.id ?? "");
  }, [vendors, vendorId, category]);

  function onAssign() {
    if (!vendorId) return;
    assign.mutate({ requestId, vendorId, note: note || undefined });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <select
          className="w-full md:w-72 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          disabled={isLoading || assign.isPending}
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
        >
          {isLoading ? (
            <option>Loading vendors…</option>
          ) : (vendors ?? []).length === 0 ? (
            <option>No vendors</option>
          ) : (
            (vendors ?? []).map((v: any) => (
              <option key={v.id} value={v.id}>
                {v.name} {v.category ? `• ${v.category}` : v.trade ? `• ${v.trade}` : ""}
              </option>
            ))
          )}
        </select>

        <Button
          className="md:ml-2"
          onClick={onAssign}
          disabled={!vendorId || assign.isPending || isLoading}
        >
          {assign.isPending ? "Assigning…" : "Assign"}
        </Button>
      </div>

      <textarea
        className="min-h-[70px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        placeholder="Optional note for the activity log (visible in timeline)…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </div>
  );
}
