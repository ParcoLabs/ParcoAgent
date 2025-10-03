import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Manager user
  const manager = await prisma.user.upsert({
    where: { email: "ops@parcolabs.com" },
    update: {},
    create: { email: "ops@parcolabs.com", name: "Parco Ops", role: "MANAGER" },
  });

  // Properties
  const [p1, p2] = await Promise.all([
    prisma.property.upsert({
      where: { id: "prop_pine" },
      update: {},
      create: { id: "prop_pine", name: "225 Pine St", address: "225 Pine St, San Francisco, CA", managerId: manager.id },
    }),
    prisma.property.upsert({
      where: { id: "prop_oak" },
      update: {},
      create: { id: "prop_oak", name: "456 Oak Ave", address: "456 Oak Ave, Austin, TX", managerId: manager.id },
    }),
  ]);

  // Vendors
  const [v1, v2] = await Promise.all([
    prisma.vendor.upsert({
      where: { id: "ven_plumbco" },
      update: {},
      create: { id: "ven_plumbco", name: "PlumbCo", email: "jobs@plumbco.example", phone: "+15550001111", category: "plumbing" },
    }),
    prisma.vendor.upsert({
      where: { id: "ven_hvacpro" },
      update: {},
      create: { id: "ven_hvacpro", name: "HVACPro", email: "dispatch@hvacpro.example", phone: "+15550002222", category: "hvac" },
    }),
  ]);

  // Requests
  const r1 = await prisma.request.create({
    data: {
      title: "Kitchen sink leak in Unit 3A",
      description: "Tenant reports slow leak under sink",
      propertyId: p1.id,
      status: "OPEN",
      reporterId: manager.id,
    },
  });

  const r2 = await prisma.request.create({
    data: {
      title: "AC not cooling, Unit 1B",
      description: "Thermostat reads 80F",
      propertyId: p2.id,
      status: "OPEN",
      reporterId: manager.id,
    },
  });

  // Drafts (one email, one SMS)
  await prisma.draft.create({
    data: {
      requestId: r1.id,
      channel: "EMAIL",
      to: "tenant.3a@example.com",
      subject: "Maintenance request received — 225 Pine St",
      body: "<p>We received your request about the kitchen sink. A vendor will contact you shortly.</p>",
      status: "PENDING",
    },
  });

  await prisma.draft.create({
    data: {
      requestId: r2.id,
      channel: "SMS",
      to: "+15550003333", // demo number
      body: "HVAC ticket logged for Unit 1B. We'll schedule service ASAP.",
      status: "PENDING",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
