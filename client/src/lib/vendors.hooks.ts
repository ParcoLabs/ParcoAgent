// client/src/lib/vendors.hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./vendors.api";
import type { VendorCategory, VendorStatus } from "@/types/vendors";

/** List vendors with filters/pagination */
export function useVendors(params: api.ListParams) {
  return useQuery<Awaited<ReturnType<typeof api.fetchVendors>>>({
    queryKey: ["vendors", params],
    queryFn: () => api.fetchVendors(params),
    staleTime: 60_000,        // cache vendor lists for 1 minute
    keepPreviousData: true,   // keep previous list while params change
  });
}

/** Single vendor detail */
export function useVendor(id?: string) {
  return useQuery<Awaited<ReturnType<typeof api.fetchVendor>> | null>({
    queryKey: ["vendor", id],
    queryFn: () => (id ? api.fetchVendor(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 60_000,
  });
}

/** Request bids from vendors */
export function useRequestBids() {
  return useMutation({
    mutationFn: api.requestBids,
  });
}

/** Approve a bid and refresh vendor lists */
export function useApproveBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.approveBid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

/** Ask a vendor for compliance documents */
export function useRequestComplianceDocs() {
  return useMutation({
    mutationFn: api.requestComplianceDocs,
  });
}

/** Approve a vendor invoice */
export function useApproveInvoice() {
  return useMutation({
    mutationFn: api.approveInvoice,
  });
}

/** Dispute a vendor invoice */
export function useDisputeInvoice() {
  return useMutation({
    mutationFn: api.disputeInvoice,
  });
}

/* small re-exports to match your existing API */
export type ListParams = api.ListParams;
export type CategoryFilter = VendorCategory | "All";
export type StatusFilter = VendorStatus | "All";
