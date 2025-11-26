import * as React from "react";
import { Bell, Plus, X, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/dashboard/sidebar";
import PropertiesList from "@/components/properties/PropertiesList";
import PropertyDetailsPane from "@/components/properties/PropertyDetailsPane";
import type { PropertyRow } from "@/types/properties";

import {
  useNotifications,
  useProperties,
  useCreateProperty,
  useAgentExecute,
  useCreateRequest, // ✅ create request from selected property
} from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";

/* Lightweight inline modal */
function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-[61] w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">{title ?? "Modal"}</h3>
          <button className="p-1 rounded hover:bg-gray-100" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = React.useState<PropertyRow | null>(null);

  // notifications
  const { data: notifications } = useNotifications();
  const notificationCount = Array.isArray(notifications) ? notifications.length : 0;

  // properties
  const { data: properties } = useProperties();

  // --------------------- Create Property ----------------------
  const [openCreate, setOpenCreate] = React.useState(false);
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [propertyType, setPropertyType] = React.useState<string>("Multifamily");
  const [unitsTotal, setUnitsTotal] = React.useState<number | "">("");
  const [yearBuilt, setYearBuilt] = React.useState<number | "">("");
  const [owner, setOwner] = React.useState("");
  const [avgRent, setAvgRent] = React.useState<number | "">("");
  const [propertyClass, setPropertyClass] = React.useState<string>("B");
  const createProperty = useCreateProperty();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    createProperty.mutate(
      { name: name.trim(), address: address.trim() || undefined },
      {
        onSuccess: (res) => {
          qc.invalidateQueries({ queryKey: ["/properties"] });
          setOpenCreate(false);
          setName("");
          setAddress("");

          const prop = (res as any)?.property;
          if (prop) {
            setSelected({
              id: String(prop.id),
              name: prop.name,
              address: prop.address ?? "",
              units: 0,
              occ: 0,
              noiTtm: 0,
            });
          }
        },
      }
    );
  }

  // ---------------------- Publish Notice (unchanged) ----------------------
  const [openNotice, setOpenNotice] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const execute = useAgentExecute();

  React.useEffect(() => {
    if (!openNotice || !selected) return;
    const s = `Notice to Tenants — ${selected.name}`;
    const b = `Hello residents of ${selected.name},

This is a building notice. Please review the information below:

• Topic: (enter details)
• Date/Time: (enter details)
• Impact: (enter details)

Thank you,
Parco PM Agent`;
    setSubject(s);
    setBody(b);
  }, [openNotice, selected]);

  function openNoticeModal() {
    if (!selected) return;
    setOpenNotice(true);
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;

    execute.mutate(
      {
        action: "publish-tenant-notice",
        payload: {
          propertyId: String(selected.id),
          subject: subject.trim(),
          body: body.trim(),
          channel: "EMAIL",
        },
      },
      { onSuccess: () => setOpenNotice(false) }
    );
  }

  // -------------------- ✅ New Request for Selected Property --------------------
  const createRequest = useCreateRequest();
  const [openNewReq, setOpenNewReq] = React.useState(false);
  const [nrSummary, setNrSummary] = React.useState("");
  const [nrCategory, setNrCategory] = React.useState("Other");
  const [nrPriority, setNrPriority] = React.useState("Medium");
  const [nrTenant, setNrTenant] = React.useState("");

  function openNewRequestModal() {
    if (!selected) return;
    setNrSummary("");
    setNrCategory("Other");
    setNrPriority("Medium");
    setNrTenant("");
    setOpenNewReq(true);
  }

  function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;

    createRequest.mutate(
      {
        summary: nrSummary.trim() || "New maintenance request",
        category: nrCategory,
        priority: nrPriority,
        property: selected.name, // server expects NAME string in mock/in-memory mode
        tenantName: nrTenant.trim() || undefined,
      },
      {
        onSuccess: (res: any) => {
          setOpenNewReq(false);
          const id = res?.id || res?.requestId;
          // Deep-link to Requests so it selects the row (requests.tsx reads ?select=)
          if (id) window.location.href = `/requests?select=${encodeURIComponent(id)}`;
          else window.location.href = `/requests`;
        },
      }
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 md:flex-row flex-col">
      <div className="md:block hidden">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Properties</h2>
              <p className="text-sm md:text-base text-gray-600 hidden sm:block">
                Today,{" "}
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <button
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Publish Notice */}
              <Button
                onClick={openNoticeModal}
                disabled={!selected}
                className="bg-blue-700 text-white hover:bg-blue-800 transition-colors flex items-center space-x-2 disabled:opacity-60"
                title={selected ? "Publish Tenant Notice" : "Select a property first"}
              >
                <Megaphone className="w-4 h-4" />
                <span className="hidden sm:inline">Publish Notice</span>
              </Button>

              {/* ✅ New Request for this Property */}
              <Button
                onClick={openNewRequestModal}
                disabled={!selected}
                className="bg-black text-white hover:bg-black/90 transition-colors flex items-center space-x-2 disabled:opacity-60"
                title={selected ? "Create Request for this Property" : "Select a property first"}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Request</span>
              </Button>

              {/* Add Property */}
              <Button
                onClick={() => setOpenCreate(true)}
                className="bg-green-700 text-white hover:bg-green-800 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Property</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: list */}
            <div className="lg:col-span-6 xl:col-span-5">
              <PropertiesList onSelect={setSelected} properties={properties as any} />
            </div>

            {/* Right: details */}
            <div className="lg:col-span-6 xl:col-span-7 min-h-[70vh]">
              <PropertyDetailsPane selected={selected} />
            </div>
          </div>
        </main>
      </div>

      {/* Add Property modal */}
      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Add Property">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="e.g., 225 Pine St"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="City, State"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button type="button" className="px-3 py-2 rounded-lg border hover:bg-gray-50" onClick={() => setOpenCreate(false)}>
              Cancel
            </button>
            <Button type="submit" className="bg-black text-white hover:bg-black/90" disabled={createProperty.isLoading}>
              {createProperty.isLoading ? "Saving..." : "Save Property"}
            </Button>
          </div>

          {createProperty.isError && (
            <p className="text-sm text-red-600">
              {(createProperty.error as any)?.message ?? "Failed to create property."}
            </p>
          )}
        </form>
      </Modal>

      {/* ✅ New Request modal (selected property) */}
      <Modal open={openNewReq} onClose={() => setOpenNewReq(false)} title="Create Request for This Property">
        <form onSubmit={handleCreateRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Summary *</label>
            <input
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="e.g., Leak under kitchen sink"
              value={nrSummary}
              onChange={(e) => setNrSummary(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                value={nrCategory}
                onChange={(e) => setNrCategory(e.target.value)}
              >
                <option>Plumbing</option>
                <option>Electrical</option>
                <option>HVAC</option>
                <option>Cleaning</option>
                <option>Noise</option>
                <option>General</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                value={nrPriority}
                onChange={(e) => setNrPriority(e.target.value)}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tenant (optional)</label>
            <input
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="e.g., Marcus Lee"
              value={nrTenant}
              onChange={(e) => setNrTenant(e.target.value)}
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button type="button" className="px-3 py-2 rounded-lg border hover:bg-gray-50" onClick={() => setOpenNewReq(false)}>
              Cancel
            </button>
            <Button type="submit" className="bg-black text-white hover:bg-black/90" disabled={createRequest.isPending || !nrSummary.trim()}>
              {createRequest.isPending ? "Creating…" : "Create Request"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Publish Notice modal */}
      <Modal open={openNotice} onClose={() => setOpenNotice(false)} title="Publish Tenant Notice">
        <form onSubmit={handlePublish} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Notice subject"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              rows={8}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your notice…"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button type="button" className="px-3 py-2 rounded-lg border hover:bg-gray-50" onClick={() => setOpenNotice(false)}>
              Cancel
            </button>
            <Button type="submit" className="bg-blue-700 text-white hover:bg-blue-800" disabled={execute.isLoading}>
              {execute.isLoading ? "Publishing…" : "Publish"}
            </Button>
          </div>

          {execute.isError && (
            <p className="text-sm text-red-600 mt-2">
              {(execute.error as any)?.message ?? "Failed to publish notice."}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
