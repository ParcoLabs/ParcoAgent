// client/src/lib/drafts.hooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./drafts.api";
import type { TDraft } from "../../../shared/contracts";

/** List all drafts */
export function useDrafts() {
  return useQuery<TDraft[]>({
    queryKey: ["drafts"],
    queryFn: () => api.fetchDrafts(),
    staleTime: 30_000,
    keepPreviousData: true,
  });
}

/** Approve + send a specific draft */
export function useApproveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.approveDraft,
    onSuccess: () => {
      // Refresh the drafts list after approval
      qc.invalidateQueries({ queryKey: ["drafts"] });
    },
  });
}
