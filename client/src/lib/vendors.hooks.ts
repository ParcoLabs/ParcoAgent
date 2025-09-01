// client/src/lib/vendors.hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./vendors.api";
import type { VendorCategory, VendorStatus } from "@/types/vendors";

export function useVendors(params: api.ListParams) {
  return useQuery({ queryKey: ["vendors", params], queryFn: () => api.fetchVendors(params) });
}

export function useVendor(id?: string) {
  return useQuery({
    queryKey: ["vendor", id],
    queryFn: () => (id ? api.fetchVendor(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useRequestBids() {
  return useMutation({ mutationFn: api.requestBids });
}

export function useApproveBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.approveBid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useRequestComplianceDocs() {
  return useMutation({ mutationFn: api.requestComplianceDocs });
}

export function useApproveInvoice() {
  return useMutation({ mutationFn: api.approveInvoice });
}

export function useDisputeInvoice() {
  return useMutation({ mutationFn: api.disputeInvoice });
}

// small re-exports
export type ListParams = api.ListParams;
export type CategoryFilter = VendorCategory | "All";
export type StatusFilter = VendorStatus | "All";
