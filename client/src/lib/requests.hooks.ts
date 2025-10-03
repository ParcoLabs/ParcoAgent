// client/src/lib/requests.hooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Category } from "@/types/requests";
import * as api from "./requests.api";
import type { TRequest, TVendor } from "../../../shared/contracts";

/**
 * List requests with params (pagination/filters).
 * - Keeps previous page while loading the next (smooth UI).
 * - Types results as TRequest[] from shared/contracts.
 */
export function useRequests(params: api.ListParams) {
  return useQuery<TRequest[]>({
    queryKey: ["requests", params],
    queryFn: () => api.fetchRequests(params),
    staleTime: 30_000,        // cache for 30s
    keepPreviousData: true,   // keep old list during param changes
  });
}

/**
 * Single request (detail view).
 */
export function useRequest(id?: string) {
  return useQuery<TRequest | null>({
    queryKey: ["request", id],
    queryFn: () => (id ? api.fetchRequest(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * Vendors filtered by category.
 */
export function useVendors(category?: Category) {
  return useQuery<TVendor[]>({
    queryKey: ["vendors", category],
    queryFn: () => api.fetchVendors(category),
    staleTime: 5 * 60_000, // vendor lists change less often
  });
}

/**
 * Assign a vendor to a request.
 * Invalidates the request detail and the requests list.
 */
export function useAssignVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.assignVendor,
    onSuccess: (_data, vars) => {
      // Expecting vars to include { requestId, ... }
      qc.invalidateQueries({ queryKey: ["request", vars.requestId] });
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

/**
 * Ask the agent to suggest responses (drafts).
 */
export function useSuggestResponses() {
  return useMutation({
    mutationFn: api.suggestResponses,
  });
}

/**
 * Send a message (email/SMS) for a request or draft.
 */
export function useSendMessage() {
  return useMutation({
    mutationFn: api.sendMessage,
  });
}
