// client/src/components/requests/RequestDetailsPane.tsx
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRequest } from "@/lib/requests.hooks";
import type { Request } from "@/types/requests";
import { Phone, Mail, MessageSquare, Wrench } from "lucide-react";
import AIComposerModal from "./AIComposerModal";
import AssignVendorModal from "./AssignVendorModal";

export default function RequestDetailsPane({
  selected,
}: {
  selected?: Request | null;
}) {
  const { data } = useRequest(selected?.id);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [composeTarget, setComposeTarget] = React.useState<
    "tenant" | "vendor" | "owner"
  >("tenant");
  const [assignOpen, setAssignOpen] = React.useState(false);

  if (!selected) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a request to view details
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{data?.title}</span>
            <div className="flex gap-2">
              <Badge
                variant={
                  selected.priority === "P1"
                    ? "destructive"
                    : selected.priority === "P2"
                    ? "default"
                    : "secondary"
                }
              >
                {selected.priority}
              </Badge>
              <Badge variant="outline">{selected.status}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Created {new Date(selected.createdAt).toLocaleString()}
          </div>
          <p>{data?.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">Tenant</div>
              <div>{data?.tenant?.name ?? "—"}</div>
              <div className="flex flex-wrap gap-3 mt-1 text-muted-foreground items-center">
                {data?.tenant?.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {data.tenant.phone}
                  </span>
                )}
                {data?.tenant?.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {data.tenant.email}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="font-medium">Property / Unit</div>
              <div>
                {selected.propertyId} • {selected.unit ?? "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {data?.timeline?.map((t) => (
              <li key={t.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{t.actor}</Badge>
                  <span className="text-muted-foreground">
                    {new Date(t.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>{t.message}</div>
                <Separator className="my-2" />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setComposeTarget("tenant");
              setComposeOpen(true);
            }}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            AI Draft → Tenant
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setComposeTarget("vendor");
              setComposeOpen(true);
            }}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            AI Draft → Vendor
          </Button>
          <Button variant="outline" onClick={() => setAssignOpen(true)}>
            <Wrench className="w-4 h-4 mr-2" />
            Assign Vendor
          </Button>
        </CardContent>
      </Card>

      <AIComposerModal
        open={composeOpen}
        onOpenChange={setComposeOpen}
        requestId={selected.id}
        defaultTarget={composeTarget}
        defaultTo={
          composeTarget === "tenant"
            ? data?.tenant?.email ?? data?.tenant?.phone
            : undefined
        }
      />
      <AssignVendorModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        requestId={selected.id}
        category={selected.category}
      />
    </div>
  );
}
