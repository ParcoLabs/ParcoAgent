// client/src/pages/properties.tsx
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import Sidebar from "@/components/dashboard/sidebar";
import PropertiesList from "@/components/properties/PropertiesList";
import PropertyDetailsPane from "@/components/properties/PropertyDetailsPane";
import type { PropertyRow } from "@/types/properties";

export default function PropertiesPage() {
  const [selected, setSelected] = React.useState<PropertyRow | null>(null);

  // match dashboard header behavior
  const { data: notifications } = useQuery({ queryKey: ["/api/notifications"] });
  const notificationCount = Array.isArray(notifications) ? notifications.length : 3;

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
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
              <Button className="bg-green-700 text-white hover:bg-green-800 transition-colors flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Property</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 xl:col-span-5">
              <PropertiesList onSelect={setSelected} />
            </div>
            <div className="lg:col-span-6 xl:col-span-7 min-h-[70vh]">
              <PropertyDetailsPane selected={selected} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
