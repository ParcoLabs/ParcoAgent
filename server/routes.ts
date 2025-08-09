import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for dashboard data
  app.get("/api/dashboard/stats", async (req, res) => {
    // Mock dashboard statistics
    res.json({
      activeRequests: 24,
      urgentIssues: 7,
      slaCompliance: 94,
      avgResolutionDays: 2.4,
    });
  });

  app.get("/api/requests", async (req, res) => {
    // Mock recent requests data
    res.json([
      {
        id: "req-1",
        propertyAddress: "123 Oak Street",
        unitNumber: "4B",
        description: "Kitchen sink leak",
        category: "plumbing",
        priority: "high",
        status: "in_progress",
        slaHoursLeft: 18,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        assignedVendor: "ProFix Plumbing Services",
      },
      {
        id: "req-2",
        propertyAddress: "456 Pine Ave",
        unitNumber: "2A",
        description: "AC not cooling",
        category: "hvac",
        priority: "urgent",
        status: "assigned",
        slaHoursLeft: 4,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        assignedVendor: "CoolAir HVAC",
      },
      {
        id: "req-3",
        propertyAddress: "789 Elm Court",
        unitNumber: "1C",
        description: "Door lock stuck",
        category: "locks",
        priority: "normal",
        status: "completed",
        slaHoursLeft: 0,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        assignedVendor: "SecureLocks Inc",
      },
    ]);
  });

  app.get("/api/vendors", async (req, res) => {
    // Mock vendor data
    res.json([
      {
        id: "vendor-1",
        name: "ProFix Plumbing",
        trade: "Plumbing",
        rating: 4.8,
        jobsCompleted: 23,
        contact: "(555) 123-4567",
      },
      {
        id: "vendor-2",
        name: "CoolAir HVAC",
        trade: "HVAC",
        rating: 4.9,
        jobsCompleted: 18,
        contact: "(555) 234-5678",
      },
      {
        id: "vendor-3",
        name: "ElectricPro",
        trade: "Electrical",
        rating: 4.7,
        jobsCompleted: 15,
        contact: "(555) 345-6789",
      },
    ]);
  });

  app.get("/api/sla-alerts", async (req, res) => {
    res.json([
      {
        id: "alert-1",
        requestId: "req-2",
        propertyAddress: "456 Pine Ave",
        category: "HVAC",
        hoursLeft: 4,
        priority: "urgent",
      },
      {
        id: "alert-2",
        requestId: "req-1",
        propertyAddress: "123 Oak St",
        category: "Plumbing",
        hoursLeft: 18,
        priority: "high",
      },
    ]);
  });

  app.get("/api/category-distribution", async (req, res) => {
    res.json([
      { category: "Plumbing", percentage: 45, color: "bg-blue-500" },
      { category: "HVAC", percentage: 25, color: "bg-blue-400" },
      { category: "Electrical", percentage: 15, color: "bg-yellow-500" },
      { category: "Locks", percentage: 10, color: "bg-gray-500" },
      { category: "General", percentage: 5, color: "bg-gray-400" },
    ]);
  });

  const httpServer = createServer(app);
  return httpServer;
}
