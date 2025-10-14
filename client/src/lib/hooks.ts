// client/src/lib/hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  // Requests & Drafts
  apiListRequests,
  apiListDrafts,
  apiRunAgent,
  apiApproveDraft,
  apiAssignVendor,

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
} from "@/lib/api";

/* -------------------------------- Requests -------------------------------- */
export function useRequests() {
  return useQuery({
    queryKey: ["/requests"],
    queryFn: apiListRequests,
  });
}

/* --------------------------------- Drafts --------------------------------- */
export function useDrafts() {
  return useQuery({
    queryKey: ["/drafts"],
    queryFn: apiListDrafts,
    // drafts can change after approvals; lightweight polling is fine for demo
    refetchInterval: 5000,
  });
}

export function useRunAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      mode,
    }: {
      requestId: string;
      mode: "tenant_update" | "vendor_outreach" | "both";
    }) => apiRunAgent(requestId, mode),
    onSuccess: () => {
      // Agent creates drafts
      qc.invalidateQueries({ queryKey: ["/drafts"] });
    },
  });
}

export function useApproveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) => apiApproveDraft(draftId),
    onSuccess: () => {
      // Status flips to SENT/FAILED
      qc.invalidateQueries({ queryKey: ["/drafts"] });
    },
  });
}

/* ----------------------------- Vendor assignment -------------------------- */
export function useAssignVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      vendorId,
      note,
    }: {
      requestId: string;
      vendorId: string;
      note?: string;
    }) => apiAssignVendor(requestId, vendorId, note),
    onSuccess: () => {
      // Reflect vendor link in requests list/detail and vendor jobs
      qc.invalidateQueries({ queryKey: ["/requests"] });
      qc.invalidateQueries({ queryKey: ["/vendor-jobs"] });
    },
  });
}

/* -------------------------------- Vendors --------------------------------- */
export function useVendors() {
  return useQuery({
    queryKey: ["/vendors"],
    queryFn: apiListVendors,
    staleTime: 60_000,
  });
}

/* ------------------------------ Dashboard data ---------------------------- */
export function useDashboardStats() {
  return useQuery({
    queryKey: ["/dashboard/stats"],
    queryFn: apiDashboardStats,
    staleTime: 30_000,
  });
}

export function useSlaAlerts() {
  return useQuery({
    queryKey: ["/sla-alerts"],
    queryFn: apiSlaAlerts,
    refetchInterval: 15_000,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["/notifications"],
    queryFn: apiNotifications,
    refetchInterval: 20_000,
  });
}

export function useCategoryDistribution() {
  return useQuery({
    queryKey: ["/category-distribution"],
    queryFn: apiCategoryDistribution,
    staleTime: 60_000,
  });
}

/* ------------------------------ Vendor Jobs ------------------------------- */
export function useVendorJobs() {
  return useQuery({
    queryKey: ["/vendor-jobs"],
    queryFn: apiListVendorJobs,
    // Always hand back an array so UI never maps undefined
    select: (data) => (Array.isArray(data) ? data : [] as any[]),
    // jobs update when assignments/progress/completions happen
    refetchInterval: 5000,
  });
}

export function useJobProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiJobProgress(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/vendor-jobs"] });
    },
  });
}

export function useJobComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiJobComplete(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/vendor-jobs"] });
    },
  });
}
