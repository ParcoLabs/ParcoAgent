// client/src/lib/analytics.hooks.ts
import { useQuery } from "@tanstack/react-query";
import * as api from "./analytics.api";
import type { AnalyticsFilters } from "@/types/analytics";

export function useKPIs(filters: AnalyticsFilters) {
  return useQuery({ queryKey: ["analytics:kpis", filters], queryFn: () => api.fetchKPIs(filters) });
}

export function useRequestTrends(filters: AnalyticsFilters) {
  return useQuery({ queryKey: ["analytics:trends", filters], queryFn: () => api.fetchRequestTrends(filters) });
}

export function useSpendByCategory(filters: AnalyticsFilters) {
  return useQuery({ queryKey: ["analytics:spend", filters], queryFn: () => api.fetchSpendByCategory(filters) });
}

export function useBacklogAging(filters: AnalyticsFilters) {
  return useQuery({ queryKey: ["analytics:aging", filters], queryFn: () => api.fetchBacklogAging(filters) });
}

export function useVendorPerformance(filters: AnalyticsFilters) {
  return useQuery({ queryKey: ["analytics:vendorperf", filters], queryFn: () => api.fetchVendorPerformance(filters) });
}

export function useInsights(filters: AnalyticsFilters) {
  return useQuery({ queryKey: ["analytics:insights", filters], queryFn: () => api.fetchInsights(filters) });
}
