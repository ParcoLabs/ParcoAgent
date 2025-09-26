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

// ─── NEW: local type for agent drafts ─────────────────────────────────────────
type Draft = {
  id: string;
  createdAt: string;
  status: "draft" | "sent";
  kind: "tenant_reply" | "vendor_outreach";
  channel: "email" | "sms";
  to: string;
  subject?: string | null;
  body: string;
};

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

  // ─── NEW: agent drafts state ────────────────────────────────────────────────
  const [drafts, setDrafts] = React.useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = React.useState(false);
  const requestId = selected?.id;

  async function loadDrafts() {
    if (!requestId) return;
    setDraftsLoading(true);
    try {
      const res = await fetch(`/api/agent/drafts?requestId=${requestId}`);
      const json = await res.json();
      setDrafts(json?.drafts ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDraftsLoading(false);
    }
  }

  async function runAgent() {
    if (!requestId) return;
    await fetch(`/api/agent/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    await loadDrafts();
  }

  async function approveDraft(id: string) {
    await fetch(`/api/agent/drafts/${id}/approve`, { method: "POST" });
    await loadDrafts();
  }

  React.useEffect(() => {
    // load drafts whenever the selected request changes
    loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

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

      {/* ─── NEW: AI Agent Drafts panel ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>AI Agent Drafts</span>
            <Button size="sm" onClick={runAgent}>
              Run Agent
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {draftsLoading ? (
            <div className="text-sm text-muted-foreground">Loading drafts…</div>
          ) : drafts.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No drafts yet. Click <span className="font-medium">Run Agent</span>.
            </div>
          ) : (
            <ul className="space-y-3">
              {drafts.map((d) => (
                <li key={d.id} className="p-3 border rounded bg-white shadow-sm text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {d.kind === "tenant_reply" ? "Tenant Reply" : "Vendor Outreach"}
                      </Badge>
                      <Badge variant="outline">{d.channel}</Badge>
                    </div>
                    <Badge
                      variant={d.status === "sent" ? "default" : "secondary"}
                      className={d.status === "sent" ? "bg-green-600 text-white" : ""}
                    >
                      {d.status}
                    </Badge>
                  </div>
                  {d.subject && <div className="mt-1 font-medium">{d.subject}</div>}
                  <div className="mt-1 whitespace-pre-wrap text-muted-foreground">{d.body}</div>
                  {d.status === "draft" && (
                    <div className="mt-2">
                      <Button size="sm" onClick={() => approveDraft(d.id)}>
                        Approve &amp; Send
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
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
