import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/dashboard/sidebar";
import StatsCards from "@/components/dashboard/stats-cards";
import NewRequestForm from "@/components/dashboard/new-request-form";
import AISuggestion from "@/components/dashboard/ai-suggestion";
import RequestsTable from "@/components/dashboard/requests-table";
import SLAAlerts from "@/components/dashboard/sla-alerts";
import CategoryChart from "@/components/dashboard/category-chart";
import TopVendors from "@/components/dashboard/top-vendors";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Dashboard() {
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
  });

  const notificationCount = notifications?.length || 3;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Property Management Dashboard</h2>
              <p className="text-gray-600">Today, {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
              <Button className="bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>New Request</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <StatsCards />
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
            {/* Recent Requests & AI Suggestions */}
            <div className="xl:col-span-2 space-y-6">
              <NewRequestForm onSuggestion={setAiSuggestion} />
              
              {aiSuggestion && <AISuggestion suggestion={aiSuggestion} />}
              
              <RequestsTable />
            </div>

            {/* Sidebar Widgets */}
            <div className="space-y-6">
              <SLAAlerts />
              <CategoryChart />
              <TopVendors />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
