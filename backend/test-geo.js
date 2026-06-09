const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count, municipality_code
        FROM wards
        WHERE municipality_code IN ('JHB', 'JHB001', 'JHB002')
        GROUP BY municipality_code
  `);
  console.log(JSON.stringify(result, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
