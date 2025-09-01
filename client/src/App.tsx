// client/src/App.tsx
import { Switch, Route } from "wouter";
import { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import Settings from "@/pages/settings"; // 👈 add this import

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Home -> dashboard */}
      <Route path="/" component={Dashboard} />

      {/* Explicit dashboard path */}
      <Route path="/dashboard" component={Dashboard} />

      {/* NEW: settings route */}
      <Route path="/settings" component={Settings} />

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
