// client/src/App.tsx
import * as React from "react";
import { Switch, Route, Redirect } from "wouter";
import DashboardPage from "@/pages/dashboard";
import RequestsPage from "@/pages/requests";
import DraftsPage from "@/pages/Drafts";      // <-- case matches file
import VendorsPage from "@/pages/vendors";   
import PropertiesPage from "@/pages/properties";
import SettingsPage from "@/pages/settings";
import AnalyticsPage from "@/pages/analytics";
import NotFound from "@/pages/not-found";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/requests" component={RequestsPage} />
      <Route path="/drafts" component={DraftsPage} />
      <Route path="/vendors" component={VendorsPage} />
      <Route path="/properties" component={PropertiesPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}