// client/src/lib/requests.hooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Category } from "@/types/requests";
import * as api from "./requests.api";

export function useRequests(params: api.ListParams) {
  return useQuery({
    queryKey: ["requests", params],
    queryFn: () => api.fetchRequests(params),
  });
}

export function useRequest(id?: string) {
  return useQuery({
    queryKey: ["request", id],
    queryFn: () => (id ? api.fetchRequest(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useVendors(category?: Category) {
  return useQuery({
    queryKey: ["vendors", category],
    queryFn: () => api.fetchVendors(category),
  });
}

export function useAssignVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.assignVendor,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["request", vars.requestId] });
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

export function useSuggestResponses() {
  return useMutation({ mutationFn: api.suggestResponses });
}

export function useSendMessage() {
  return useMutation({ mutationFn: api.sendMessage });
}
