// pcheck.cjs
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient();
  try {
    console.log('ENV  USE_DB     =', process.env.USE_DB);
    console.log('ENV  SQLITE_URL =', process.env.SQLITE_URL);
    console.log('ENV  DATABASE_URL =', process.env.DATABASE_URL);

    const count = await p.vendor.count();
    console.log('vendor count =', count);

    const vendors = await p.vendor.findMany({ take: 5 });
    console.log('vendors =', vendors);
  } catch (e) {
    console.error('Prisma error:', e);
  } finally {
    await p.$disconnect();
  }
})();
