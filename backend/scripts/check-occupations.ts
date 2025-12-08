/**
 * Check current occupations data
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOccupations() {
  try {
    // First get table structure
    const structure = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'occupations'
      ORDER BY ordinal_position
    ` as any[];
    console.log('Table structure:');
    structure.forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });

    // Get all data
    const occupations = await prisma.$queryRaw`SELECT * FROM occupations` as any[];
    console.log('\nTotal occupations:', occupations.length);
    console.log('\nAll occupations:');
    occupations.forEach((o: any, i: number) => {
      console.log(`  ${i + 1}:`, JSON.stringify(o));
    });
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOccupations();

