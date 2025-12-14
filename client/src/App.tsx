import * as React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "@/pages/dashboard";
import RequestsPage from "@/pages/requests";
import DraftsPage from "@/pages/Drafts";
import VendorsPage from "@/pages/vendors";
import PropertiesPage from "@/pages/properties";
import SettingsPage from "@/pages/settings";
import AnalyticsPage from "@/pages/analytics";
import NotFound from "@/pages/not-found";
import AgentConsole from "@/pages/AgentConsole";
import AuditPage from "@/pages/audit";
import DailyBriefPage from "@/pages/daily-brief";

import AgentLayer from "@/components/agent/AgentLayer";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/drafts" element={<DraftsPage />} />
        <Route path="/vendors" element={<VendorsPage />} />
        <Route path="/properties" element={<PropertiesPage />} />
        <Route path="/agent" element={<AgentConsole />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/daily-brief" element={<DailyBriefPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Desktop: floating Agent button; Mobile: hidden (in bottom nav) */}
      <div className="hidden md:block">
        <AgentLayer />
      </div>

      {/* Mobile bottom navigation bar */}
      <MobileBottomNav />
    </>
  );
}
