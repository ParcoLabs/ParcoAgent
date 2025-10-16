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

  // Properties
  apiListProperties,
  apiCreateProperty,
  apiUpdateProperty,

  // 🆕 Demo Reset
  apiDemoReset,
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
      qc.invalidateQueries({ queryKey: ["/drafts"] });
    },
  });
}

export function useApproveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) => apiApproveDraft(draftId),
    onSuccess: () => {
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
      qc.invalidateQueries({ queryKey: ["/requests"] });
      qc.invalidateQueries({ queryKey: ["/vendor-jobs"] });
      qc.refetchQueries({ queryKey: ["/vendor-jobs"], type: "active" });
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

/* ------------------------------ Properties -------------------------------- */
/** IMPORTANT: canonical key uses '/api/properties' to match older components */
const PROPS_KEYS = {
  canonical: "/api/properties",
  legacy: "/properties",
};

export function useProperties() {
  return useQuery({
    queryKey: [PROPS_KEYS.canonical],
    queryFn: apiListProperties,
    staleTime: 30_000,
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; address?: string | null }) =>
      apiCreateProperty(input),
    onSuccess: () => {
      // Invalidate both the new and legacy keys
      qc.invalidateQueries({ queryKey: [PROPS_KEYS.canonical] });
      qc.invalidateQueries({ queryKey: [PROPS_KEYS.legacy] });
      // Force immediate refetch of any mounted lists
      qc.refetchQueries({ queryKey: [PROPS_KEYS.canonical], type: "active" });
      qc.refetchQueries({ queryKey: [PROPS_KEYS.legacy], type: "active" });
    },
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { name?: string | null; address?: string | null };
    }) => apiUpdateProperty(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROPS_KEYS.canonical] });
      qc.invalidateQueries({ queryKey: [PROPS_KEYS.legacy] });
      qc.refetchQueries({ queryKey: [PROPS_KEYS.canonical], type: "active" });
      qc.refetchQueries({ queryKey: [PROPS_KEYS.legacy], type: "active" });
    },
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
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiJobProgress(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/vendor-jobs"] });
      qc.refetchQueries({ queryKey: ["/vendor-jobs"], type: "active" });
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
      qc.refetchQueries({ queryKey: ["/vendor-jobs"], type: "active" });
    },
  });
}

/* ------------------------------- Demo Reset ------------------------------- */
export function useDemoReset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiDemoReset(),
    onSuccess: () => {
      // Refresh the core lists after reset
      qc.invalidateQueries({ queryKey: [PROPS_KEYS.canonical] });
      qc.invalidateQueries({ queryKey: [PROPS_KEYS.legacy] });
      qc.invalidateQueries({ queryKey: ["/requests"] });
      qc.invalidateQueries({ queryKey: ["/vendor-jobs"] });
      qc.invalidateQueries({ queryKey: ["/vendors"] });
      qc.invalidateQueries({ queryKey: ["/notifications"] });

      qc.refetchQueries({ type: "active" });
    },
  });
}
