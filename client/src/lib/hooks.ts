// client/src/lib/hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiListDrafts,
  apiApproveDraft,
  apiRunAgent,
  apiListRequests,
  apiAssignVendor,
} from "@/lib/api";

// Requests list
export function useRequests() {
  return useQuery({ queryKey: ["/requests"], queryFn: apiListRequests });
}

// Drafts list (auto-refresh to show SENT/FAILED changes)
export function useDrafts() {
  return useQuery({
    queryKey: ["/drafts"],
    queryFn: apiListDrafts,
    refetchInterval: 5000,
  });
}

// Generate drafts (tenant/vendor/both)
export function useRunAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, mode }: { requestId: string; mode: "tenant_update" | "vendor_outreach" | "both" }) =>
      apiRunAgent(requestId, mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/drafts"] });
    },
  });
}

// Approve & send a draft
export function useApproveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) => apiApproveDraft(draftId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/drafts"] });
    },
  });
}

// Optional: assign a vendor to a request
export function useAssignVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, vendorId, note }: { requestId: string; vendorId: string; note?: string }) =>
      apiAssignVendor(requestId, vendorId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/requests"] });
    },
  });
}
