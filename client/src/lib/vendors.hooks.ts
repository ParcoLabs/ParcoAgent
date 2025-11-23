// client/src/lib/vendors.hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiListVendors,
  apiListVendorJobs,
  apiJobProgress,
  apiJobComplete,
  apiVendorProspects,
  apiApproveProspect as apiApproveProspectCall,
  apiAgentExecute,
} from "@/lib/api";

/* --------------------------- internal utils ------------------------------- */
function invalidateBySubstring(qc: ReturnType<typeof useQueryClient>, parts: string[]) {
  qc.invalidateQueries({
    predicate: (q) => {
      const key = Array.isArray(q.queryKey) ? q.queryKey : [q.queryKey as any];
      const flat = key.map((k) => (typeof k === "string" ? k : JSON.stringify(k))).join(" ");
      return parts.some((p) => flat.includes(p));
    },
  });
}

/* -------------------------------- Vendors --------------------------------- */
export function useVendors() {
  return useQuery({ queryKey: ["/vendors"], queryFn: apiListVendors, staleTime: 60_000 });
}

/* ------------------------------ Vendor Jobs ------------------------------- */
export function useVendorJobs() {
  return useQuery({
    queryKey: ["/vendor-jobs"],
    queryFn: apiListVendorJobs,
    select: (data) => (Array.isArray(data) ? data : ([] as any[])),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
  });
}

export function useJobProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => apiJobProgress(id, note),
    onSuccess: () => {
      invalidateBySubstring(qc, ["/vendor-jobs", "vendor-jobs", "/audit", "audit"]);
      qc.refetchQueries({ queryKey: ["/vendor-jobs"], type: "active" });
    },
  });
}

export function useJobComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => apiJobComplete(id, note),
    onSuccess: () => {
      invalidateBySubstring(qc, ["/vendor-jobs", "vendor-jobs", "/audit", "audit"]);
      qc.refetchQueries({ queryKey: ["/vendor-jobs"], type: "active" });
    },
  });
}

/* --------------------------- Prospects (Source 3) ------------------------- */
export function useVendorProspects() {
  return useQuery({
    queryKey: ["/vendor-prospects"],
    queryFn: apiVendorProspects,
    refetchOnWindowFocus: false,
  });
}

/**
 * Approve a sourced vendor → creates a Job
 * Guardrails (enforced server-side, surfaced in onError):
 *  - require estimate OR overrideReason
 *  - if estimate > 750, overrideReason is required
 *  - optional allowDuplicate to create another job for the same vendor+request
 */
export function useApproveProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      estimate,
      overrideReason,
      allowDuplicate,
    }: {
      id: string;
      estimate?: number;
      overrideReason?: string;
      allowDuplicate?: boolean;
    }) =>
      apiApproveProspectCall(id, {
        // send only defined fields so Express JSON parser is happy
        ...(estimate !== undefined ? { estimate } : {}),
        ...(overrideReason ? { overrideReason } : {}),
        ...(allowDuplicate !== undefined ? { allowDuplicate } : {}),
      }),
    onSuccess: () => {
      invalidateBySubstring(qc, ["/vendor-prospects", "/vendor-jobs", "vendor-jobs", "/audit"]);
      qc.refetchQueries({ type: "active" });
    },
    // bubble guardrail messages so the UI can toast them
    onError: (err: any) => {
      // no invalidation on error; let the caller read err.message/err.data
      // eslint-disable-next-line no-console
      console.warn("[useApproveProspect] failed:", err);
    },
  });
}

/* ----------------------- Convenience Agent Actions ------------------------ */
/** Schedule a vendor visit (adds job.visit, writes audit) */
export function useScheduleVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { jobId: string; when: string; window?: string; note?: string }) =>
      apiAgentExecute({ action: "schedule-visit", payload }),
    onSuccess: () => {
      invalidateBySubstring(qc, ["/vendor-jobs", "vendor-jobs", "/audit", "audit"]);
      qc.refetchQueries({ type: "active" });
    },
  });
}

/** Send confirmations (email/SMS) for a scheduled visit */
export function useSendVisitConfirmations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      jobId: string;
      tenantEmail?: string | null;
      vendorEmail?: string | null;
      tenantPhone?: string | null;
      vendorPhone?: string | null;
      channels?: Array<"tenant_email" | "vendor_email" | "tenant_sms" | "vendor_sms">;
      when?: string;
      window?: string;
      note?: string;
    }) => apiAgentExecute({ action: "send-visit-confirmations", payload }),
    onSuccess: () => {
      invalidateBySubstring(qc, ["/audit"]);
      qc.refetchQueries({ type: "active" });
    },
  });
}
