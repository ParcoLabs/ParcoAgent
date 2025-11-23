// server/db/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Make reseeding deterministic and FK-safe for SQLite
  // (Good for dev only — turning FK checks off just for the reset.)
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF`);

  // ---- Delete in dependency order (children -> parents) ----
  // Some of these models may not exist in your schema; wrap each in try/catch.
  const safeDelete = async <T extends keyof PrismaClient>(name: T) => {
    try {
      // @ts-ignore dynamic access is fine for our dev reset
      await prisma[name].deleteMany();
    } catch { /* ignore if table/model doesn't exist */ }
  };

  await safeDelete('agentDraft');   // if you have drafts
  await safeDelete('prospect');     // if you have vendor prospects
  await safeDelete('job');          // if you have jobs
  await safeDelete('request');      // requests likely reference properties/vendors
  await safeDelete('vendor');
  await safeDelete('property');
  await safeDelete('setting');      // optional settings table

  // Re-enable FK checks
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON`);

  // ---- Seed baseline data ----
  await prisma.vendor.createMany({
    data: [
      { id: 'V001', name: 'AquaFix Pro',     category: 'Plumbing',   email: null, phone: null },
      { id: 'V002', name: 'CoolAir Masters', category: 'HVAC',       email: null, phone: null },
      { id: 'V003', name: 'Bright Electric', category: 'Electrical', email: null, phone: null },
    ],
  });

  await prisma.property.createMany({
    data: [
      { id: '225-pine', name: '225 Pine St', address: 'San Francisco, CA • Multifamily' },
      { id: '456-oak',  name: '456 Oak Ave', address: 'Austin, TX • Multifamily' },
      { id: '12-maple', name: '12 Maple Ct', address: 'Miami, FL • Mixed Use' },
    ],
  });

  // If you later add Settings etc., seed here with upsert/create.
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
