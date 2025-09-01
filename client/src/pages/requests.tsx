// client/src/pages/requests.tsx
import * as React from "react";
import RequestsList from "@/components/requests/RequestsList";
import RequestDetailsPane from "@/components/requests/RequestDetailsPane";
import type { Request } from "@/types/requests";

export default function RequestsPage() {
  const [selected, setSelected] = React.useState<Request | null>(null);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Dashboard ▸ Requests</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 xl:col-span-5">
          <RequestsList onSelect={setSelected} />
        </div>
        <div className="lg:col-span-6 xl:col-span-7 min-h-[70vh]">
          <RequestDetailsPane selected={selected} />
        </div>
      </div>
    </div>
  );
}
