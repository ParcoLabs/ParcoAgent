// client/src/lib/properties.hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./properties.api";
import type { PropertyType, PropertyStatus } from "@/types/properties";

/** List properties with filters/pagination */
export function useProperties(params: api.ListParams) {
  return useQuery<Awaited<ReturnType<typeof api.fetchProperties>>>({
    queryKey: ["properties", params],
    queryFn: () => api.fetchProperties(params),
    staleTime: 60_000,        // cache for 1 minute
    keepPreviousData: true,   // keep old data while filters change
  });
}

/** Single property detail */
export function useProperty(id?: string) {
  return useQuery<Awaited<ReturnType<typeof api.fetchProperty>> | null>({
    queryKey: ["property", id],
    queryFn: () => (id ? api.fetchProperty(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 60_000,
  });
}

/** Ask agent to suggest property plans */
export function useSuggestPlans() {
  return useMutation({
    mutationFn: api.suggestPlans,
  });
}

/** Apply a selected plan and refresh property data */
export function useApplyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.applyPlan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property"] });
    },
  });
}

/* Re-exports for convenience */
export type ListParams = api.ListParams;
export type TypeFilter = PropertyType | "All";
export type StatusFilter = PropertyStatus | "All";
