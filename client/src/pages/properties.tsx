// client/src/pages/properties.tsx
import * as React from "react";
import { Bell, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/dashboard/sidebar";
import PropertiesList from "@/components/properties/PropertiesList";
import PropertyDetailsPane from "@/components/properties/PropertyDetailsPane";
import type { PropertyRow } from "@/types/properties";

// react-query hooks we already added in hooks.ts
import { useNotifications, useProperties, useCreateProperty } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";

/* Lightweight inline modal so we don’t touch your component library */
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

  // keep your “selection drives detail pane” pattern
  const [selected, setSelected] = React.useState<PropertyRow | null>(null);

  // notifications (use our hook so it hits /notifications)
  const { data: notifications } = useNotifications();
  const notificationCount = Array.isArray(notifications) ? notifications.length : 0;

  // properties data (list component can still handle selection)
  const { data: properties } = useProperties();

  // create flow
  const [openCreate, setOpenCreate] = React.useState(false);
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");

  const createProperty = useCreateProperty();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    createProperty.mutate(
      { name: name.trim(), address: address.trim() || undefined },
      {
        onSuccess: (res) => {
          // refresh list and close modal
          qc.invalidateQueries({ queryKey: ["/properties"] });
          setOpenCreate(false);
          setName("");
          setAddress("");

          // try to pre-select the created property if it’s in the response
          const prop = (res as any)?.property;
          if (prop) {
            setSelected({
              id: String(prop.id),
              name: prop.name,
              address: prop.address ?? "",
              // fill any optional fields PropertiesList/Details expect
              units: 0,
              occ: 0,
              noiTtm: 0,
            });
          }
        },
      }
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 md:flex-row flex-col">
      {/* Sidebar like dashboard */}
      <div className="md:block hidden">
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header (copy of dashboard header with title swapped) */}
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

              {/* Add Property button (kept exactly where you had it) */}
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

        {/* Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: list */}
            <div className="lg:col-span-6 xl:col-span-5">
              {/* If your PropertiesList already fetches internally, it will ignore the props.
                  If it accepts them, this lets it render instantly. */}
              <PropertiesList onSelect={setSelected} properties={properties as any} />
            </div>

            {/* Right: details */}
            <div className="lg:col-span-6 xl:col-span-7 min-h-[70vh]">
              <PropertyDetailsPane selected={selected} />
            </div>
          </div>
        </main>
      </div>

      {/* Create modal */}
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
            <button
              type="button"
              className="px-3 py-2 rounded-lg border hover:bg-gray-50"
              onClick={() => setOpenCreate(false)}
            >
              Cancel
            </button>
            <Button
              type="submit"
              className="bg-black text-white hover:bg-black/90"
              disabled={createProperty.isLoading}
            >
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
    </div>
  );
}
