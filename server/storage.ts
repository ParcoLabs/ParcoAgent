// server/storage.ts

// Types
export type Settings = {
  profile: {
    company?: string | null;
    phone?: string | null;
    timezone?: string | null;
    smsNotifications?: boolean;
  };
  property: {
    name?: string | null;
    address?: string | null;
    type?: string | null;
    unitCount?: number | null;
    rentCycle?: "Monthly" | "Weekly" | "Annual" | null;
  };
  channels: {
    gmail: { connected: boolean };
    sms: { connected: boolean };
    portalEnabled: boolean;
  };
  sla: {
    rules: {
      leakHours: number;
      noHeatHours: number;
      normalHours: number;
    };
  };
  rent: {
    dueDay: number; // 1..28
    lateFeePercent: number;
    reminderCadence: string;
  };
  vendors: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    type?: string | null;
    serviceArea?: string | null;
  }>;
  tenants: Array<{
    id: string;
    name: string;
    unit: string;
    lease_start?: string;
    lease_end?: string;
    rent?: number;
    email?: string;
    phone?: string;
  }>;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// In-memory store (swap to DB later)
const store: Settings = {
  profile: { company: null, phone: null, timezone: null, smsNotifications: false },
  property: { name: null, address: null, type: null, unitCount: null, rentCycle: "Monthly" },
  channels: { gmail: { connected: false }, sms: { connected: false }, portalEnabled: false },
  sla: { rules: { leakHours: 4, noHeatHours: 6, normalHours: 48 } },
  rent: { dueDay: 1, lateFeePercent: 5, reminderCadence: "3/5/7 days" },
  vendors: [],
  tenants: [],
};

// Accessors
export function getSettings(): Settings {
  return store;
}

export function updateProperty(payload: Partial<Settings["property"]>) {
  store.property = { ...store.property, ...payload };
}

export function updateChannels(payload: Partial<Settings["channels"]>) {
  store.channels = {
    gmail: { connected: payload.gmail?.connected ?? store.channels.gmail.connected },
    sms: { connected: payload.sms?.connected ?? store.channels.sms.connected },
    portalEnabled:
      payload.portalEnabled !== undefined ? payload.portalEnabled : store.channels.portalEnabled,
  };
}

export function addVendor(v: Omit<Settings["vendors"][number], "id">) {
  const vendor = { id: uid(), ...v };
  store.vendors.push(vendor);
  return vendor;
}

export function updateSla(payload: Settings["sla"]) {
  store.sla = payload;
}

export function updateRent(payload: Partial<Settings["rent"]>) {
  store.rent = { ...store.rent, ...payload };
}

export function importTenants(rows: Array<Omit<Settings["tenants"][number], "id">>) {
  let inserted = 0;
  let errors = 0;
  rows.forEach((r) => {
    if (!r || !r.name || !r.unit) {
      errors++;
      return;
    }
    store.tenants.push({ id: uid(), ...r });
    inserted++;
  });
  return { inserted, errors };
}
