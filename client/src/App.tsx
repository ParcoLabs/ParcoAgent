// client/src/App.tsx
import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryFn } from "@/lib/api";

import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import Settings from "@/pages/settings"; // 👈 settings route
import Requests from "@/pages/requests"; // 👈 requests route
import Properties from "@/pages/properties"; // 👈 NEW: properties route
import Analytics from "@/pages/analytics";
import Vendors from "@/pages/vendors";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn,                 // ✅ global fetcher
      staleTime: 30_000,       // cache items for 30s
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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

      {/* Analytics */}
      <Route path="/analytics" component={Analytics} />

      {/* Vendors */}
      <Route path="/vendors" component={Vendors} />

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
