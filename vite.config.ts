import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
        ]
      : []),
  ],

  root: path.resolve(import.meta.dirname, "client"),

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },

  build: {
    outDir: path.resolve(import.meta.dirname, "client", "dist"),
    emptyOutDir: true,
  },

  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      "fb86b036-cabb-48b7-ba46-55f5a7c98771-00-6o2ppk5qblfc.spock.replit.dev", // your exact Replit domain
      ".spock.replit.dev", // wildcard for Replit preview clusters
      ".replit.dev",       // generic fallback
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
