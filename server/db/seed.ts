// server/db/seed.ts (or prisma/seed.ts depending on your setup)
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // --- Core users (manager) ---
  const manager = await prisma.user.upsert({
    where: { email: "ops@parcolabs.com" },
    update: {},
    create: { email: "ops@parcolabs.com", name: "Parco Ops", role: "MANAGER" },
  });

  // --- Properties ---
  const pine = await prisma.property.upsert({
    where: { id: "prop_pine" },
    update: {},
    create: {
      id: "prop_pine",
      name: "225 Pine St",
      address: "225 Pine St, San Francisco, CA",
      managerId: manager.id,
    },
  });

  const oak = await prisma.property.upsert({
    where: { id: "prop_oak" },
    update: {},
    create: {
      id: "prop_oak",
      name: "456 Oak Ave",
      address: "456 Oak Ave, Austin, TX",
      managerId: manager.id,
    },
  });

  // --- Vendors (keep categories lowercase to match your examples) ---
  await prisma.vendor.upsert({
    where: { id: "ven_plumbco" },
    update: {},
    create: {
      id: "ven_plumbco",
      name: "PlumbCo",
      email: "jobs@plumbco.example",
      phone: "+15550001111",
      category: "plumbing",
    },
  });

  await prisma.vendor.upsert({
    where: { id: "ven_hvacpro" },
    update: {},
    create: {
      id: "ven_hvacpro",
      name: "HVACPro",
      email: "dispatch@hvacpro.example",
      phone: "+15550002222",
      category: "hvac",
    },
  });

  await prisma.vendor.upsert({
    where: { id: "ven_bright_elec" },
    update: {},
    create: {
      id: "ven_bright_elec",
      name: "Bright Electric",
      email: "service@brightelectric.example",
      phone: "+15550004444",
      category: "electrical",
    },
  });

  // --- Requests (stable IDs so multiple runs don't duplicate) ---
  const r1 = await prisma.request.upsert({
    where: { id: "req_kitchen_sink" },
    update: {},
    create: {
      id: "req_kitchen_sink",
      title: "Kitchen sink leak in Unit 3A",
      description: "Tenant reports slow leak under cabinet.",
      propertyId: pine.id,
      status: "OPEN",
      reporterId: manager.id,
      // add optional fields here only if your schema supports them (e.g., priority, category, slaDueAt)
    },
  });

  const r2 = await prisma.request.upsert({
    where: { id: "req_ac_not_cooling" },
    update: {},
    create: {
      id: "req_ac_not_cooling",
      title: "AC not cooling, Unit 1B",
      description: "Thermostat reads 80°F; compressor short cycling.",
      propertyId: oak.id,
      status: "OPEN",
      reporterId: manager.id,
    },
  });

  const r3 = await prisma.request.upsert({
    where: { id: "req_outlet_sparks" },
    update: {},
    create: {
      id: "req_outlet_sparks",
      title: "Living room outlet sparks",
      description: "Sparks observed when plugging in vacuum.",
      propertyId: oak.id,
      status: "OPEN",
      reporterId: manager.id,
    },
  });

  // --- Drafts (stable IDs; EMAIL/SMS + PENDING to match your enums) ---
  await prisma.draft.upsert({
    where: { id: "drft_r1_tenant_email" },
    update: {},
    create: {
      id: "drft_r1_tenant_email",
      requestId: r1.id,
      channel: "EMAIL",
      to: "tenant.3a@example.com",
      subject: "Maintenance request received — 225 Pine St",
      body:
        "<p>We received your request about the kitchen sink. A vendor will contact you shortly.</p>",
      status: "PENDING",
    },
  });

  await prisma.draft.upsert({
    where: { id: "drft_r2_tenant_sms" },
    update: {},
    create: {
      id: "drft_r2_tenant_sms",
      requestId: r2.id,
      channel: "SMS",
      to: "+15550003333",
      body:
        "HVAC ticket logged for Unit 1B. We'll schedule service ASAP.",
      status: "PENDING",
    },
  });

  // A vendor outreach sample email draft (for demo of Approve & Send)
  await prisma.draft.upsert({
    where: { id: "drft_r3_vendor_email" },
    update: {},
    create: {
      id: "drft_r3_vendor_email",
      requestId: r3.id,
      channel: "EMAIL",
      to: "service@brightelectric.example",
      subject: "Job inquiry: Outlet issue at 456 Oak Ave",
      body:
        "<p>We need availability in the next 24h for diagnostics and repair. Please confirm and include ETA/materials.</p>",
      status: "PENDING",
    },
  });

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
