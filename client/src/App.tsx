// client/src/App.tsx
import * as React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "@/pages/dashboard";
import RequestsPage from "@/pages/requests";
import DraftsPage from "@/pages/Drafts";      // <-- case matches file
import VendorsPage from "@/pages/vendors";   // <-- new page
import PropertiesPage from "@/pages/properties";
import SettingsPage from "@/pages/settings";
import AnalyticsPage from "@/pages/analytics";
import NotFound from "@/pages/not-found";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/requests" element={<RequestsPage />} />
      <Route path="/drafts" element={<DraftsPage />} />
      <Route path="/vendors" element={<VendorsPage />} />
      <Route path="/properties" element={<PropertiesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
