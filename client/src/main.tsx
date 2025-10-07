// client/src/main.tsx
import * as React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import App from "./App";
import "./index.css"; // if you have tailwind or globals

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <App />
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
);