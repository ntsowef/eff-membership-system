import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log("Connecting to Prisma...");
  try {
    const counts = await prisma.$queryRawUnsafe(`
      SELECT source_type, COUNT(*) as count
      FROM sms_send_log 
      WHERE source_type IN ('birthday', 'manual', 'expiration_reminder', 'voter_registration')
      GROUP BY source_type
    `);
    console.log("Counts:", counts);

    const rows = await prisma.$queryRawUnsafe(`
      SELECT *
      FROM sms_send_log 
      WHERE source_type IN ('birthday', 'manual', 'expiration_reminder', 'voter_registration')
      LIMIT 10
    `);
    
    console.log("First row:");
    console.dir((rows as any[])[0]);

  } catch (err: any) {
    console.error("Prisma error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
