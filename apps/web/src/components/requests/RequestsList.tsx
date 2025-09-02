// client/src/components/requests/RequestsList.tsx
import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRequests } from "@/lib/requests.hooks";
import type { Category, Request } from "@/types/requests";

export type RequestsListProps = {
  onSelect: (req: Request) => void;
};

export default function RequestsList({ onSelect }: RequestsListProps) {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<string>("All");
  const [category, setCategory] = React.useState<Category | "All">("All");
  const { data, isLoading } = useRequests({ search, status, category });

  return (
    <Card className="h-full">
      <CardHeader className="gap-3">
        <CardTitle className="text-lg">Requests</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            placeholder="Search requests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select onValueChange={setStatus} value={status}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {[
                "All",
                "new",
                "triaging",
                "waiting_tenant",
                "waiting_vendor",
                "scheduled",
                "in_progress",
                "resolved",
                "closed",
              ].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => setCategory(v as any)} value={category}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {[
                "All",
                "Plumbing",
                "HVAC",
                "Electrical",
                "Billing",
                "Leasing",
                "Noise",
                "Other",
              ].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white shadow-sm">
              <tr className="text-muted-foreground">
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Priority</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">SLA</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td className="p-4" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && data?.rows?.length === 0 && (
                <tr>
                  <td className="p-4" colSpan={5}>
                    No results
                  </td>
                </tr>
              )}
              {data?.rows?.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => onSelect(r)}
                >
                  <td className="p-3 font-medium">{r.id}</td>
                  <td className="p-3">{r.title}</td>
                  <td className="p-3">
                    <Badge
                      variant={
                        r.priority === "P1"
                          ? "destructive"
                          : r.priority === "P2"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {r.priority}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{r.status}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {r.slaDueAt ? timeUntil(r.slaDueAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function timeUntil(iso: string) {
  const t = new Date(iso).getTime() - Date.now();
  if (t <= 0) return "due";
  const h = Math.floor(t / (1000 * 60 * 60));
  const m = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
  return `${h}h ${m}m`;
}
