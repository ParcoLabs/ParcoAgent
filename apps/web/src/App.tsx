// client/src/App.tsx
import { Switch, Route } from "wouter";
import { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import Settings from "@/pages/settings"; // 👈 settings route
import Requests from "@/pages/requests"; // 👈 requests route
import Properties from "@/pages/properties"; // 👈 NEW: properties route
import Vendors from "@/pages/vendors"; 
import Analytics from "@/pages/analytics";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Home -> dashboard */}
      <Route path="/" component={Dashboard} />

      {/* Explicit dashboard path */}
      <Route path="/dashboard" component={Dashboard} />

      {/* Settings */}
      <Route path="/settings" component={Settings} />

      {/* Requests */}
      <Route path="/requests" component={Requests} />

      {/* Properties */}
      <Route path="/properties" component={Properties} />

      {/* Vendors */}
      <Route path="/vendors" component={Vendors} />

      {/* Analytics */}
      <Route path="/analytics" component={Analytics} />
      

      {/* Fallback (keep as last) */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
