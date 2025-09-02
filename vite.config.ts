import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: "0.0.0.0",
    strictPort: true,
    // ✅ allow Replit preview hostnames
    allowedHosts: true, // or replace with the exact host shown in the error
    proxy: { "/api": "http://localhost:4000" },
    // (Optional) helps HMR over HTTPS preview
    hmr: {
      clientPort: 443,
      protocol: "wss"
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../../packages/shared/src")
    }
  }
});
