// client/src/components/requests/RequestDetailsPane.tsx
import * as React from "react";
import {
  useDrafts,
  useApproveDraft,
  useVendors,
  useAssignVendor,
} from "@/lib/hooks";
import {
  Mail,
  Mails,
  User,
  Wrench,
  Check,
  Loader2,
  ChevronDown,
} from "lucide-react";

/* ----------------------------- shape helpers ------------------------------ */
function getRequestIdFromDraft(d: any): string | undefined {
  return (
    d?.requestId ??
    d?.request_id ??
    d?.reqId ??
    (typeof d?.request === "string" ? d.request : d?.request?.id) ??
    d?.meta?.requestId ??
    d?.meta?.request_id ??
    undefined
  );
}
function getType(d: any): "tenant_update" | "vendor_outreach" | "other" {
  const t = String(
    d?.type ?? d?.kind ?? d?.channel ?? d?.meta?.type ?? d?.tags?.[0] ?? ""
  ).toLowerCase();
  if (t.includes("tenant")) return "tenant_update";
  if (t.includes("vendor") || t.includes("outreach") || t.includes("quote")) return "vendor_outreach";
  const ch = String(d?.channel || "").toLowerCase();
  if (ch.includes("tenant")) return "tenant_update";
  if (ch.includes("vendor")) return "vendor_outreach";
  return "other";
}
function getChannel(d: any): "email" | "sms" | "other" {
  const c = String(d?.channel ?? d?.meta?.channel ?? "").toLowerCase();
  if (c.includes("email")) return "email";
  if (c.includes("sms") || c.includes("text")) return "sms";
  return "email";
}
function getSubject(d: any): string {
  return (
    d?.subject ??
    d?.title ??
    d?.meta?.subject ??
    (getType(d) === "vendor_outreach" ? "Quote request" : "Tenant notice")
  );
}
function getBody(d: any): string {
  const b = d?.body ?? d?.text ?? d?.content ?? d?.meta?.body ?? "";
  return typeof b === "string" ? b : JSON.stringify(b, null, 2);
}
function getTo(d: any): string | undefined {
  return d?.to ?? d?.recipient ?? d?.meta?.to ?? d?.meta?.recipient ?? undefined;
}
function getDraftId(d: any): string {
  return String(d?.id ?? d?.draftId ?? d?.uuid ?? d?._id ?? Math.random().toString(36).slice(2));
}

/* --------------------------------- UI bits -------------------------------- */
function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "blue" | "amber" }) {
  const map: Record<string, string> = {
    slate: "border-slate-300 bg-slate-50 text-slate-800",
    green: "border-emerald-300 bg-emerald-50 text-emerald-800",
    blue: "border-blue-300 bg-blue-50 text-blue-800",
    amber: "border-amber-300 bg-amber-50 text-amber-800",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${map[tone]}`}>{children}</span>;
}

function DraftCard({
  draft,
  onApprove,
  disabled,
}: {
  draft: any;
  onApprove: (id: string) => void;
  disabled?: boolean;
}) {
  const type = getType(draft);
  const channel = getChannel(draft);
  const subject = getSubject(draft);
  const body = getBody(draft);
  const to = getTo(draft);
  const icon = type === "vendor_outreach" ? <Wrench className="h-4 w-4" /> : <User className="h-4 w-4" />;
  const tone = type === "vendor_outreach" ? "blue" : "amber";

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div className="font-medium">{type === "vendor_outreach" ? "Vendor Outreach" : "Tenant Notice"}</div>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={tone}>{type === "vendor_outreach" ? "vendor" : "tenant"}</Pill>
          <Pill>
            {channel === "email" ? (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                email
              </span>
            ) : (
              "sms"
            )}
          </Pill>
        </div>
      </div>

      <div className="mt-2 text-sm">
        <div className="text-slate-500">To</div>
        <div className="font-mono text-slate-800">{to || "—"}</div>
      </div>

      <div className="mt-3">
        <div className="text-slate-500 text-xs">Subject</div>
        <div className="text-sm font-medium">{subject}</div>
      </div>

      <div className="mt-3">
        <div className="text-slate-500 text-xs">Body</div>
        <pre className="whitespace-pre-wrap rounded-md border bg-slate-50 p-3 text-[12.5px] leading-5">
{body}
        </pre>
      </div>

      <div className="mt-3 flex items-center justify-end">
        <button
          onClick={() => onApprove(getDraftId(draft))}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
          title="Approve & Send"
        >
          {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {disabled ? "Sending…" : "Approve & Send"}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------- vendor dropdown ----------------------------- */
function VendorSelect({
  vendors,
  value,
  onChange,
  disabled,
}: {
  vendors: Array<{ id: string; name: string }>;
  value?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("");

  const shown = React.useMemo(
    () => vendors.filter((v) => v.name.toLowerCase().includes(filter.toLowerCase())),
    [vendors, filter]
  );

  const current = vendors.find((v) => v.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((s) => !s)}
        className="w-full rounded-lg border bg-white px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-60 inline-flex items-center justify-between"
      >
        <span className="truncate">{current ? current.name : "Select vendor…"}</span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-1 w-full rounded-lg border bg-white shadow-lg p-2">
          <input
            className="w-full rounded-md border px-2 py-1 text-xs mb-2"
            placeholder="Filter vendors…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="max-h-56 overflow-auto">
            {shown.length === 0 ? (
              <div className="text-xs text-gray-500 px-2 py-1">No vendors</div>
            ) : (
              shown.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    onChange(v.id);
                    setOpen(false);
                  }}
                  className="w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-50"
                >
                  {v.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- main ---------------------------------- */
export default function RequestDetailsPane({ selected }: { selected: { id: string } | null }) {
  const { data: drafts = [], isFetching } = useDrafts();
  const approve = useApproveDraft();

  const { data: vendors = [] } = useVendors();
  const assignVendor = useAssignVendor();

  const [vendorId, setVendorId] = React.useState<string>("");
  const [note, setNote] = React.useState<string>("");

  React.useEffect(() => {
    // reset picker when switching requests
    setVendorId("");
    setNote("");
  }, [selected?.id]);

  const requestId = selected?.id ? String(selected.id) : "";
  const mine = React.useMemo(() => {
    if (!requestId) return [];
    return drafts.filter((d: any) => String(getRequestIdFromDraft(d) || "") === requestId);
  }, [drafts, requestId]);

  const vendorDrafts = mine.filter((d: any) => getType(d) === "vendor_outreach");
  const tenantDrafts = mine.filter((d: any) => getType(d) === "tenant_update");
  const otherDrafts = mine.filter(
    (d: any) => !["vendor_outreach", "tenant_update"].includes(getType(d))
  );

  if (!selected) return <div className="text-sm text-slate-500">Select a request to view details.</div>;

  return (
    <div className="space-y-4">
      {/* -------------------------- Assign Vendor --------------------------- */}
      <div className="rounded-xl border bg-white p-4">
        <div className="text-base font-semibold mb-3">Assign Vendor</div>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(240px,1fr),120px] gap-2">
          <VendorSelect vendors={vendors as any[]} value={vendorId} onChange={setVendorId} disabled={assignVendor.isPending} />
          <button
            type="button"
            onClick={() => {
              if (!requestId || !vendorId) return;
              assignVendor.mutate({ requestId, vendorId, note: note || undefined });
            }}
            disabled={!vendorId || assignVendor.isPending}
            className="rounded-lg border bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {assignVendor.isPending ? "Assigning…" : "Assign"}
          </button>
        </div>
        <input
          className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Optional note for the activity log (visible in timeline)…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* -------------------------- AI Agent Drafts ------------------------- */}
      <div className="rounded-xl border bg-white p-4">
        <div className="text-base font-semibold mb-3">AI Agent Drafts</div>

        {isFetching && drafts.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-white p-4 text-sm text-slate-500">Fetching drafts…</div>
        ) : null}

        {mine.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-white p-4 text-sm text-slate-600">
            No drafts yet. Click <span className="font-medium">Run Agent</span> (choose <em>Both</em> or <em>Tenant Notice</em>) or{" "}
            <span className="font-medium">Source 3 Quotes</span> to generate drafts.
          </div>
        ) : (
          <div className="space-y-3">
            {tenantDrafts.map((d) => (
              <DraftCard
                key={getDraftId(d)}
                draft={d}
                onApprove={(id) => approve.mutate(id)}
                disabled={approve.isPending}
              />
            ))}
            {vendorDrafts.map((d) => (
              <DraftCard
                key={getDraftId(d)}
                draft={d}
                onApprove={(id) => approve.mutate(id)}
                disabled={approve.isPending}
              />
            ))}
            {otherDrafts.length > 0 ? (
              <div className="rounded-xl border bg-white p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Mails className="h-4 w-4" />
                  <div className="font-medium">Other Drafts</div>
                </div>
                <div className="space-y-2">
                  {otherDrafts.map((d) => (
                    <DraftCard
                      key={getDraftId(d)}
                      draft={d}
                      onApprove={(id) => approve.mutate(id)}
                      disabled={approve.isPending}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
