// client/src/lib/requests.api.ts
import { Category, Request, RequestDetail, Vendor } from "@/types/requests";

const USE_MOCKS = true;

// ---- MOCK DATA ----
let mockRequests: RequestDetail[] = [
  {
    id: "124",
    title: "Leak under sink (Unit 3B)",
    description:
      "Dripping pipe under kitchen sink. Small puddle, worsens with use.",
    status: "triaging",
    priority: "P2",
    category: "Plumbing",
    propertyId: "prop-225-pine",
    unit: "3B",
    tenantId: "t-ana",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    slaDueAt: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
    attachments: [],
    tenant: {
      id: "t-ana",
      name: "Ana Gomez",
      email: "ana@example.com",
      phone: "+1-555-0101",
      preferredChannel: "email",
    },
    timeline: [
      {
        id: "ev1",
        type: "created",
        actor: "tenant",
        message: "Tenant submitted request",
        createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
      },
      {
        id: "ev2",
        type: "note",
        actor: "ai",
        message: "Auto-tagged as Plumbing, urgency P2",
        createdAt: new Date(Date.now() - 1000 * 60 * 108).toISOString(),
      },
    ],
  },
  {
    id: "123",
    title: "AC not cooling (Unit 2A)",
    description: "AC on but blowing warm air despite thermostat at 68F.",
    status: "waiting_vendor",
    priority: "P2",
    category: "HVAC",
    propertyId: "prop-225-pine",
    unit: "2A",
    tenantId: "t-jordan",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
    slaDueAt: new Date(Date.now() + 1000 * 60 * 300).toISOString(),
    tenant: {
      id: "t-jordan",
      name: "Jordan Lee",
      email: "jordan@example.com",
      phone: "+1-555-0102",
      preferredChannel: "sms",
    },
    timeline: [
      {
        id: "ev3",
        type: "created",
        actor: "tenant",
        message: "Tenant submitted request",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      },
      {
        id: "ev4",
        type: "status_changed",
        actor: "pm",
        message: "Waiting on vendor quotes",
        createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      },
    ],
  },
];

const mockVendors: Vendor[] = [
  {
    id: "v-plumbfast",
    name: "PlumbFast Co.",
    category: "Plumbing",
    phone: "+1-555-2001",
    email: "dispatch@plumbfast.com",
    rating: 4.7,
    preferred: true,
    etaMinutes: 180,
  },
  {
    id: "v-clearflow",
    name: "ClearFlow Plumbing",
    category: "Plumbing",
    phone: "+1-555-2002",
    email: "jobs@clearflow.io",
    rating: 4.5,
    preferred: false,
    etaMinutes: 240,
  },
  {
    id: "v-hvacpro",
    name: "HVAC Pro Team",
    category: "HVAC",
    phone: "+1-555-2101",
    email: "ops@hvacpro.team",
    rating: 4.6,
    preferred: true,
    etaMinutes: 360,
  },
];

export type ListParams = {
  search?: string;
  status?: string;
  category?: Category | "All";
  page?: number;
  pageSize?: number;
};

export async function fetchRequests(
  params: ListParams = {}
): Promise<{ rows: Request[]; total: number }> {
  if (!USE_MOCKS) {
    // const res = await fetch(`/api/requests?` + new URLSearchParams(params as any));
    // if (!res.ok) throw new Error("Failed to fetch requests");
    // return res.json();
  }
  let rows = [...mockRequests];
  if (params.search) {
    const q = params.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
    );
  }
  if (params.status && params.status !== "All") {
    rows = rows.filter((r) => r.status === params.status);
  }
  if (params.category && params.category !== "All") {
    rows = rows.filter((r) => r.category === params.category);
  }
  const total = rows.length;
  return { rows, total };
}

export async function fetchRequest(id: string): Promise<RequestDetail | null> {
  if (!USE_MOCKS) {
    // const res = await fetch(`/api/requests/${id}`);
    // if (!res.ok) return null;
    // return res.json();
  }
  return mockRequests.find((r: RequestDetail) => r.id === id) || null;
}
