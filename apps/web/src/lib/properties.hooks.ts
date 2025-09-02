// client/src/lib/properties.hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./properties.api";
import type { PropertyType, PropertyStatus } from "@/types/properties";

export function useProperties(params: api.ListParams) {
  return useQuery({ queryKey: ["properties", params], queryFn: () => api.fetchProperties(params) });
}

export function useProperty(id?: string) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: () => (id ? api.fetchProperty(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useSuggestPlans() {
  return useMutation({ mutationFn: api.suggestPlans });
}

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

// Re-export the list params type for convenience
export type ListParams = api.ListParams;
export type TypeFilter = PropertyType | "All";
export type StatusFilter = PropertyStatus | "All";
