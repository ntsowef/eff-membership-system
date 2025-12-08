import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMetroMappings() {
  console.log('=== Checking Metropolitan Municipality Mappings ===\n');
  
  // Metropolitan municipalities in SA
  const metroCodes = ['BUF', 'CPT', 'EKU', 'ETH', 'JHB', 'MAN', 'NMA', 'TSH'];
  
  // Check internal municipalities table for metros
  console.log('Internal Municipalities (Metros):');
  const internalMetros = await prisma.municipalities.findMany({
    where: { municipality_code: { in: metroCodes } },
    select: { municipality_code: true, municipality_name: true, district_code: true }
  });
  for (const m of internalMetros) {
    console.log(`  ${m.municipality_code}: ${m.municipality_name} (district: ${m.district_code})`);
  }
  
  // Check IEC mappings for metros
  console.log('\n\nIEC Mappings for Metros:');
  const iecMetroMappings = await prisma.iec_municipality_mappings.findMany({
    where: { municipality_code: { in: metroCodes } }
  });
  for (const m of iecMetroMappings) {
    console.log(`  IEC ID ${m.iec_municipality_id}: ${m.iec_municipality_name}`);
    console.log(`    -> Internal: ${m.municipality_code} (district: ${m.district_code})`);
  }
  
  // Also search by IEC naming convention (3-letter codes)
  console.log('\n\nIEC Mappings starting with metro codes in IEC name:');
  const iecByCode = await prisma.iec_municipality_mappings.findMany({
    where: {
      OR: [
        { iec_municipality_name: { startsWith: 'BUF' } },
        { iec_municipality_name: { startsWith: 'CPT' } },
        { iec_municipality_name: { startsWith: 'EKU' } },
        { iec_municipality_name: { startsWith: 'ETH' } },
        { iec_municipality_name: { startsWith: 'JHB' } },
        { iec_municipality_name: { startsWith: 'MAN' } },
        { iec_municipality_name: { startsWith: 'NMA' } },
        { iec_municipality_name: { startsWith: 'TSH' } }
      ]
    }
  });
  for (const m of iecByCode) {
    console.log(`  IEC ID ${m.iec_municipality_id}: ${m.iec_municipality_name}`);
    console.log(`    -> Internal: ${m.municipality_code} (district: ${m.district_code})`);
  }

  // Check if any metro is missing
  console.log('\n\n=== Missing Metro Mappings ===');
  for (const code of metroCodes) {
    const exists = iecMetroMappings.find(m => m.municipality_code === code);
    if (!exists) {
      console.log(`  MISSING: ${code}`);
    }
  }
  
  await prisma.$disconnect();
}

checkMetroMappings();

