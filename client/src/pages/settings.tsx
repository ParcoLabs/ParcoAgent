// client/src/pages/settings.tsx
import React, { useMemo, useState } from "react";
import {
  SectionCard,
  PMProfileForm,
  PropertyForm,
  TenantsForm,
  ChannelsForm,
  VendorsForm,
  SLAForm,
  RentForm,
} from "@/components/settings";
import { getInitialSetupDone, setInitialSetupDone } from "@/lib/onboarding";

// 🆕 hooks to create property and reset demo (handles cache invalidation)
import { useCreateProperty, useDemoReset } from "@/lib/hooks";

type SectionKey =
  | "profile"
  | "property"
  | "tenants"
  | "channels"
  | "vendors"
  | "sla"
  | "rent";

const sections: { key: SectionKey; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "property", label: "Property" },
  { key: "tenants", label: "Tenants" },
  { key: "channels", label: "Channels" },
  { key: "vendors", label: "Vendors" },
  { key: "sla", label: "SLA" },
  { key: "rent", label: "Rent & Payments" },
];

export default function Settings() {
  const isFirstTime = useMemo(() => !getInitialSetupDone(), []);
  const [active, setActive] = useState<SectionKey>("profile");

  // 🆕 create + demo reset hooks
  const createProperty = useCreateProperty();
  const demoReset = useDemoReset();
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  function handleFinishInitial() {
    setInitialSetupDone(true);
    alert("Setup saved. You can edit these anytime in Settings.");
  }

  // 🆕 demo reset via hook so properties/requests/jobs UI refresh
  function handleDemoReset() {
    setResetMsg(null);
    demoReset.mutate(undefined, {
      onSuccess: (res) => {
        setResetMsg("Demo data reset. Requests, jobs, and properties restored to seed.");
      },
      onError: (e: any) => setResetMsg(e?.message || "Reset failed."),
    });
  }

  // 🆕 optional: if PropertyForm exposes an onCreate prop, this wires it
  const handlePropertyCreate = (vals: { name?: string; address?: string }) => {
    const name = (vals?.name || "").trim();
    if (!name) return;
    createProperty.mutate(
      { name, address: (vals?.address || "").trim() || undefined },
      {
        onSuccess: () => {
          // nothing else; hooks invalidate and refetch properties lists
        },
      }
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>
        {isFirstTime && (
          <button
            onClick={handleFinishInitial}
            className="px-4 py-2 rounded-xl bg-green-600 text-white"
          >
            Finish Initial Setup
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto mb-6">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={`px-4 py-2 rounded-xl border transition ${
              active === s.key
                ? "bg-black text-white border-black"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="space-y-6">
        {active === "profile" && (
          <SectionCard title="Property Manager Profile" hint="Company details, timezone, notifications">
            <PMProfileForm />
          </SectionCard>
        )}

        {active === "property" && (
          <SectionCard title="First Property" hint="Name, address, unit info and rent cycle">
            {/* If PropertyForm supports it, this will create a row in /properties */}
            <PropertyForm onCreate={handlePropertyCreate} />
          </SectionCard>
        )}

        {active === "tenants" && (
          <SectionCard title="Tenants" hint="Upload CSV or add manually">
            <TenantsForm />
          </SectionCard>
        )}

        {active === "channels" && (
          <SectionCard title="Channels" hint="Gmail/Outlook and SMS">
            <ChannelsForm />
          </SectionCard>
        )}

        {active === "vendors" && (
          <SectionCard title="Preferred Vendors" hint="Plumbing, HVAC, Electric, etc.">
            <VendorsForm />
          </SectionCard>
        )}

        {active === "sla" && (
          <SectionCard title="SLA Rules" hint="Response windows by issue type">
            <SLAForm />
          </SectionCard>
        )}

        {active === "rent" && (
          <SectionCard title="Rent & Payments" hint="Stripe connect, due dates, late fees, reminders">
            <RentForm />
          </SectionCard>
        )}

        {/* Demo Utilities */}
        <SectionCard title="Demo Utilities" hint="Reset demo data to the initial seed (requests, jobs, drafts).">
          <div className="flex items-center gap-3">
            <button
              onClick={handleDemoReset}
              disabled={demoReset.isLoading}
              className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
            >
              {demoReset.isLoading ? "Resetting…" : "Demo Reset"}
            </button>
            {resetMsg && <div className="text-sm text-gray-700">{resetMsg}</div>}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
