// client/src/lib/hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  // Requests & Drafts
  apiListRequests,
  apiListDrafts,
  apiRunAgent,
  apiApproveDraft,
  apiAssignVendor,
  apiCreateRequest,
  apiIngestEmail,
  apiIngestSms,

  // Vendors & Analytics
  apiListVendors,
  apiDashboardStats,
  apiSlaAlerts,
  apiNotifications,
  apiCategoryDistribution,

  // Vendor Jobs
  apiListVendorJobs,
  apiJobProgress,
  apiJobComplete,
  apiJobProof,

  // Properties
  apiListProperties,
  apiCreateProperty,
  apiUpdateProperty,

  // Demo Reset
  apiDemoReset,

  // Agent Execute
  apiAgentExecute,
  type AgentExecuteInput,

  // Audit
  apiAuditList,

  // generic fetcher
  api,
} from "@/lib/api";

/* ───────────────────────────── helpers ───────────────────────────── */

function invalidateBySubstring(qc: ReturnType<typeof useQueryClient>, parts: string[]) {
  qc.invalidateQueries({
    predicate: (q) => {
      const key = Array.isArray(q.queryKey) ? q.queryKey : [q.queryKey as any];
      const flat = key.map((k) => (typeof k === "string" ? k : JSON.stringify(k))).join(" ");
      return parts.some((p) => flat.includes(p));
    },
  });
}

/** Normalize /requests responses to a plain array */
function normalizeRequests(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.requests)) return data.data.requests;
  return [];
}

function safeArray<T = any>(v: any, fallback: T[] = []): T[] {
  return Array.isArray(v) ? (v as T[]) : fallback;
}

/* ───────────────────────────── requests ───────────────────────────── */

export function useRequests() {
  return useQuery({
    queryKey: ["/requests"],
    queryFn: apiListRequests,
    select: normalizeRequests,
    // Prevent “undefined” data warnings:
    placeholderData: [],
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

export function useCreateRequest(opts?: { onSuccess?: (r: any) => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      summary: string;
      category: string; // "Plumbing" | "Electrical" | ...
      priority: string; // "Low" | "Medium" | "High" | "Urgent"
      /** In mock mode, server expects PROPERTY NAME (string) */
      property: string;
      tenantName?: string;
    }) => apiCreateRequest(input),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["/requests"] });
      invalidateBySubstring(qc, ["/dashboard/stats", "/notifications"]);
      opts?.onSuccess?.(res);
    },
    onError: (e) => opts?.onError?.(e),
  });
}

/* ───────────────────────────── drafts ───────────────────────────── */

export function useDrafts() {
  return useQuery({
    queryKey: ["/drafts"],
    queryFn: apiListDrafts,
    placeholderData: [],
    staleTime: 0,
    refetchOnMount: "always",
  });
}

/** Key fix: after /agent/run we invalidate + delayed re-invalidate drafts */
export function useRunAgent(opts?: { onSuccess?: (r: any, v: any) => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      requestId: string;
      mode: "tenant_update" | "vendor_outreach" | "both" | "source-quotes" | "source_quotes";
    }) => apiRunAgent(input.requestId, input.mode),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["/drafts"] });
      qc.invalidateQueries({ queryKey: ["/requests"] });
      // small follow-up to catch compose latency
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["/drafts"] });
      }, 600);
      opts?.onSuccess?.(res, vars);
    },
    onError: (e) => opts?.onError?.(e),
  });
}

export function useApproveDraft(opts?: { onSuccess?: () => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) => apiApproveDraft(draftId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/drafts"] });
      qc.invalidateQueries({ queryKey: ["/vendor-jobs"] });
      qc.invalidateQueries({ queryKey: ["/requests"] });
      opts?.onSuccess?.();
    },
    onError: (e) => opts?.onError?.(e),
  });
}

/* ─────────────────────── vendor assignment ─────────────────────── */

export function useAssignVendor(opts?: { onSuccess?: () => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, vendorId, note }: { requestId: string; vendorId: string; note?: string }) =>
      apiAssignVendor(requestId, vendorId, note),
    onSuccess: () => {
      invalidateBySubstring(qc, ["/requests", "/vendor-jobs", "/audit"]);
      qc.invalidateQueries({ queryKey: ["/vendor-prospects"] });
      opts?.onSuccess?.();
    },
    onError: (e) => opts?.onError?.(e),
  });
}

/* ───────────────────────────── vendors ───────────────────────────── */

export function useVendors() {
  return useQuery({
    queryKey: ["/vendors"],
    queryFn: apiListVendors,
    select: (d) => safeArray(d),
    placeholderData: [],
    staleTime: 30_000,
  });
}

/* ──────────────────────────── properties ─────────────────────────── */

export function useProperties() {
  return useQuery({
    queryKey: ["/properties"],
    queryFn: apiListProperties,
    select: (d) => safeArray(d),
    placeholderData: [],
    staleTime: 0,
  });
}

export function useCreateProperty(opts?: { onSuccess?: () => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; address?: string | null }) => apiCreateProperty(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/properties"] });
      opts?.onSuccess?.();
    },
    onError: (e) => opts?.onError?.(e),
  });
}

export function useUpdateProperty(opts?: { onSuccess?: () => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: { name?: string | null; address?: string | null } }) =>
      apiUpdateProperty(vars.id, vars.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/properties"] });
      opts?.onSuccess?.();
    },
    onError: (e) => opts?.onError?.(e),
  });
}

/* ─────────────────────── dashboard & analytics ─────────────────────── */

export function useDashboardStats() {
  return useQuery({
    queryKey: ["/dashboard/stats"],
    queryFn: apiDashboardStats,
    placeholderData: {},
  });
}
export function useSlaAlerts() {
  return useQuery({
    queryKey: ["/sla-alerts"],
    queryFn: apiSlaAlerts,
    select: (d) => safeArray(d),
    placeholderData: [],
    refetchInterval: 15_000,
  });
}
export function useNotifications() {
  return useQuery({
    queryKey: ["/notifications"],
    queryFn: apiNotifications,
    select: (d) => safeArray(d),
    placeholderData: [],
    refetchInterval: 20_000,
  });
}
export function useCategoryDistribution() {
  return useQuery({
    queryKey: ["/category-distribution"],
    queryFn: apiCategoryDistribution,
    placeholderData: { buckets: [] },
  });
}

/* ───────────────────────────── vendor jobs ───────────────────────────── */

export function useVendorJobs() {
  return useQuery({
    queryKey: ["/vendor-jobs"],
    queryFn: apiListVendorJobs,
    select: (d) => safeArray(d),
    placeholderData: [],
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useJobProgress(opts?: { onSuccess?: () => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; note?: string }) => apiJobProgress(vars.id, vars.note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/vendor-jobs"] });
      qc.invalidateQueries({ queryKey: ["/audit"] });
      opts?.onSuccess?.();
    },
    onError: (e) => opts?.onError?.(e),
  });
}

export function useJobProof(opts?: { onSuccess?: () => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; url?: string; note?: string }) =>
      apiJobProof(vars.id, { url: vars.url, note: vars.note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/vendor-jobs"] });
      qc.invalidateQueries({ queryKey: ["/audit"] });
      opts?.onSuccess?.();
    },
    onError: (e) => opts?.onError?.(e),
  });
}

export function useJobComplete(opts?: { onSuccess?: () => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; note?: string }) => apiJobComplete(vars.id, vars.note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/vendor-jobs"] });
      qc.invalidateQueries({ queryKey: ["/requests"] });
      qc.invalidateQueries({ queryKey: ["/audit"] });
      opts?.onSuccess?.();
    },
    onError: (e) => opts?.onError?.(e),
  });
}

/* ───────────────────────────── prospects (quotes) ───────────────────────────── */

export function useVendorProspects() {
  return useQuery({
    queryKey: ["/vendor-prospects"],
    queryFn: () => api<any[]>("/vendor-prospects"),
    select: (d) => safeArray(d),
    placeholderData: [],
    refetchOnWindowFocus: true,
  });
}

export function useApproveVendorProspect(opts?: { onSuccess?: () => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      estimatedCost?: number;
      overrideReason?: string;
      force?: boolean;
    }) =>
      api(`/vendor-prospects/${vars.id}/approve`, {
        method: "POST",
        body: {
          ...(vars.estimatedCost !== undefined ? { estimatedCost: vars.estimatedCost } : {}),
          ...(vars.overrideReason ? { overrideReason: vars.overrideReason } : {}),
          ...(vars.force ? { force: vars.force } : {}),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/vendor-prospects"] });
      qc.invalidateQueries({ queryKey: ["/vendor-jobs"] });
      qc.invalidateQueries({ queryKey: ["/requests"] });
      qc.invalidateQueries({ queryKey: ["/audit"] });
      opts?.onSuccess?.();
    },
    onError: (e) => opts?.onError?.(e),
  });
}

/* ───────────────────── daily brief / ingest / demo ───────────────────── */

export function useDailyBrief() {
  return useQuery({
    queryKey: ["/agent/daily-brief"],
    queryFn: () => api("/agent/daily-brief"),
    placeholderData: { text: "" },
  });
}

export function useEmailDailyBrief(opts?: { onSuccess?: () => void; onError?: (e: any) => void }) {
  return useMutation({
    mutationFn: (email: string) => api("/agent/daily-brief/email", { method: "POST", body: { to: email } }),
    onSuccess: () => opts?.onSuccess?.(),
    onError: (e) => opts?.onError?.(e),
  });
}

export function useIngestEmail(opts?: { onSuccess?: (r: any) => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof apiIngestEmail>[0]) => apiIngestEmail(payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["/requests"] });
      opts?.onSuccess?.(res);
    },
    onError: (e) => opts?.onError?.(e),
  });
}
export function useIngestSms(opts?: { onSuccess?: (r: any) => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof apiIngestSms>[0]) => apiIngestSms(payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["/requests"] });
      opts?.onSuccess?.(res);
    },
    onError: (e) => opts?.onError?.(e),
  });
}

export function useDemoReset(opts?: { onSuccess?: () => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiDemoReset(),
    onSuccess: () => {
      invalidateBySubstring(qc, [
        "/properties",
        "/requests",
        "/vendor-jobs",
        "/vendors",
        "/notifications",
        "/dashboard/stats",
        "/sla-alerts",
        "/category-distribution",
        "/drafts",
        "/vendor-prospects",
        "/audit",
      ]);
      opts?.onSuccess?.();
    },
    onError: (e) => opts?.onError?.(e),
  });
}

/* ───────────────────────────── agent execute ───────────────────────────── */

export function useAgentExecute(opts?: { onSuccess?: () => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AgentExecuteInput) => apiAgentExecute(input),
    onSuccess: () => {
      invalidateBySubstring(qc, ["/notifications", "/drafts", "/audit"]);
      qc.invalidateQueries({ queryKey: ["/vendor-jobs"] });
      opts?.onSuccess?.();
    },
    onError: (e) => opts?.onError?.(e),
  });
}

/* ─────────────────────────── convenience actions ─────────────────────────── */

export function useScheduleVisit(opts?: { onSuccess?: () => void; onError?: (e: any) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { jobId: string; when: string; window?: string; note?: string }) =>
      apiAgentExecute({ action: "schedule-visit", payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/vendor-jobs"] });
      qc.invalidateQueries({ queryKey: ["/audit"] });
      opts?.onSuccess?.();
    },
    onError: (e) => opts?.onError?.(e),
  });
}

/* ───────────────────────────── audit & SLA ───────────────────────────── */

export function useAudit(filters?: { actor?: string; action?: string; requestId?: string; jobId?: string }) {
  return useQuery({
    queryKey: ["/audit", filters || {}],
    queryFn: () => apiAuditList(filters),
    placeholderData: [],
    staleTime: 15_000,
  });
}

export function useRequestSla(id?: string | null) {
  return useQuery({
    queryKey: ["/requests", id, "sla"],
    enabled: !!id,
    queryFn: async () =>
      (await api(`/requests/${id}/sla`)) as {
        requestId: string;
        policy: { firstResponseMin: number; resolutionMin: number };
        timers: {
          firstResponse: { remainingMin: number; overdue: boolean };
          resolution: { remainingMin: number; overdue: boolean };
        };
        generatedAt: string;
      },
    placeholderData: {
      requestId: id ?? "",
      policy: { firstResponseMin: 60, resolutionMin: 1440 },
      timers: {
        firstResponse: { remainingMin: 60, overdue: false },
        resolution: { remainingMin: 1440, overdue: false },
      },
      generatedAt: new Date().toISOString(),
    },
    staleTime: 30_000,
  });
}
