// client/src/lib/analytics.api.ts
import type {
  AnalyticsFilters,
  KPIResponse,
  SeriesPoint,
  SpendBreakdown,
  VendorPerfPoint,
  InsightsResponse,
} from "@/types/analytics";

const USE_MOCKS = true;

// Helpers
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function fetchKPIs(
  _filters: AnalyticsFilters
): Promise<KPIResponse> {
  if (!USE_MOCKS) {
    // const res = await fetch("/api/analytics/kpis?" + new URLSearchParams(_filters as any));
    // return res.json();
  }
  // Mocked but realistic values
  return {
    occupancyPct: 92,
    avgRent: 2145,
    capRate: 6.1,
    ttmNOI: 832000,

    slaHitPct: 86,
    avgResponseHrs: 2.8,
    costPerWO: 487,

    compliancePct: 78,
    backlog7: 9,
    backlog30: 3,
  };
}

export async function fetchRequestTrends(
  filters: AnalyticsFilters
): Promise<SeriesPoint[]> {
  if (!USE_MOCKS) {
    // const res = await fetch("/api/analytics/trends/requests?" + new URLSearchParams(filters as any));
    // return res.json();
  }
  const points: SeriesPoint[] = [];
  const labels =
    filters.groupBy === "quarter"
      ? ["Q1", "Q2", "Q3", "Q4"]
      : filters.groupBy === "week"
      ? ["W1", "W2", "W3", "W4", "W5", "W6"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  labels.forEach((lab, i) => {
    points.push({
      x: lab,
      y: 20 + Math.round(Math.random() * 30), // volume
      y2: 5 + Math.round(Math.random() * 12), // late
    });
  });
  return points;
}

export async function fetchSpendByCategory(
  _filters: AnalyticsFilters
): Promise<SpendBreakdown[]> {
  if (!USE_MOCKS) {
    // const res = await fetch("/api/analytics/spend/category?" + new URLSearchParams(_filters as any));
    // return res.json();
  }
  return [
    { label: "Plumbing", value: 18250 },
    { label: "HVAC", value: 14600 },
    { label: "Electrical", value: 9800 },
    { label: "Cleaning", value: 4100 },
    { label: "Other", value: 3200 },
  ];
}

export async function fetchBacklogAging(
  _filters: AnalyticsFilters
): Promise<SeriesPoint[]> {
  if (!USE_MOCKS) {
    // const res = await fetch("/api/analytics/backlog/aging?" + new URLSearchParams(_filters as any));
    // return res.json();
  }
  return [
    { x: "0–7d", y: 22 },
    { x: "8–14d", y: 7 },
    { x: "15–30d", y: 3 },
    { x: "31–60d", y: 2 },
    { x: "60d+", y: 1 },
  ];
}

export async function fetchVendorPerformance(
  _filters: AnalyticsFilters
): Promise<VendorPerfPoint[]> {
  if (!USE_MOCKS) {
    // const res = await fetch("/api/analytics/vendor/performance?" + new URLSearchParams(_filters as any));
    // return res.json();
  }
  return [
    { vendorId: "v-plumbfast", vendorName: "PlumbFast Co.", onTimePct: 92, avgCost: 475 },
    { vendorId: "v-clearflow", vendorName: "ClearFlow Plumbing", onTimePct: 88, avgCost: 505 },
    { vendorId: "v-hvacpro", vendorName: "HVAC Pro Team", onTimePct: 89, avgCost: 610 },
    { vendorId: "v-sparkelect", vendorName: "Spark Electrical", onTimePct: 80, avgCost: 690 },
  ];
}

export async function fetchInsights(
  _filters: AnalyticsFilters
): Promise<InsightsResponse> {
  if (!USE_MOCKS) {
    // const res = await fetch("/api/analytics/insights", { method: "POST", body: JSON.stringify(_filters) });
    // return res.json();
  }
  return {
    bullets: [
      "Plumbing spend ↑22% MoM at 225 Pine St; requesting bids could save ~$1.2k/mo.",
      "Requests spike on weekends; shift first-response coverage to lift SLA by ~14%.",
      "Vacancy loss est. $3.1k (Unit 3A, 45 days). Consider promo & showing schedule.",
    ],
  };
}
