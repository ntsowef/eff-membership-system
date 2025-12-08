import * as XLSX from 'xlsx';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface IECMunicipality {
  iec_municipality_id: number;
  iec_municipality_name: string;
  iec_province_id: number;
  iec_province_name: string;
}

async function populateMappings() {
  try {
    console.log('=== IEC Municipality Mappings Population Script ===\n');

    // 1. Read IEC municipalities from Excel
    const filePath = path.join(__dirname, '../../reports/VOTING_STATIONS_ELECTIONS.xlsx');
    console.log('Reading Excel file:', filePath);
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    // Extract unique IEC municipalities
    const iecMunicipalities = new Map<number, IECMunicipality>();
    for (const row of data) {
      const id = parseInt(row.MunicipalityID);
      if (!iecMunicipalities.has(id)) {
        iecMunicipalities.set(id, {
          iec_municipality_id: id,
          iec_municipality_name: row.Municipality,
          iec_province_id: parseInt(row.ProvinceID),
          iec_province_name: row.Province
        });
      }
    }
    console.log(`Found ${iecMunicipalities.size} unique IEC municipalities\n`);

    // 2. Get our internal municipalities
    const internalMunis = await prisma.municipalities.findMany({
      select: { municipality_code: true, municipality_name: true, district_code: true }
    });
    console.log(`Found ${internalMunis.length} internal municipalities\n`);

    // 3. Get province mappings
    const provinceMappings = await prisma.iec_province_mappings.findMany();
    const provinceIdToCode = new Map(provinceMappings.map(p => [p.iec_province_id, p.province_code]));

    // 4. Generate mappings
    const mappingsToInsert: any[] = [];
    let matchedCount = 0;

    for (const [id, iec] of iecMunicipalities) {
      const provinceCode = provinceIdToCode.get(iec.iec_province_id);
      if (!provinceCode) {
        console.log(`Warning: No province mapping for IEC Province ID ${iec.iec_province_id}`);
        continue;
      }

      // Extract code from IEC municipality name (e.g., "EC101" from "EC101 - Dr. Beyers Naude")
      const iecNameParts = iec.iec_municipality_name.split(' - ');
      const iecCode = iecNameParts[0].trim();

      // Match by code first (most reliable)
      let match = internalMunis.find(m => m.municipality_code === iecCode);

      // If no code match, try name similarity
      if (!match) {
        const iecFullName = iecNameParts.length > 1 ? iecNameParts[1].trim() : iec.iec_municipality_name;
        match = internalMunis.find(m => {
          const internalName = m.municipality_name.toLowerCase();
          const iecLower = iecFullName.toLowerCase();
          return internalName.includes(iecLower) || 
                 iecLower.includes(internalName.replace(' sub-region', '').replace('sub-region of ', ''));
        });
      }

      if (match) {
        matchedCount++;
        mappingsToInsert.push({
          municipality_code: match.municipality_code,
          municipality_name: match.municipality_name,
          province_code: provinceCode,
          district_code: match.district_code,
          iec_municipality_id: id.toString(),
          iec_municipality_name: iec.iec_municipality_name,
          iec_province_id: iec.iec_province_id,
          is_active: true
        });
      } else {
        console.log(`Unmatched: ${id} - ${iec.iec_municipality_name}`);
      }
    }

    console.log(`\nMatched: ${matchedCount}/${iecMunicipalities.size}`);

    // 5. Clear existing and insert new mappings
    console.log('\nClearing existing mappings...');
    await prisma.iec_municipality_mappings.deleteMany({});

    console.log(`Inserting ${mappingsToInsert.length} new mappings...`);
    for (const mapping of mappingsToInsert) {
      await prisma.iec_municipality_mappings.create({ data: mapping });
    }

    console.log('\n✅ IEC Municipality mappings populated successfully!');

    // Verify
    const count = await prisma.iec_municipality_mappings.count();
    console.log(`Total mappings in database: ${count}`);

    // Show sample
    const sample = await prisma.iec_municipality_mappings.findMany({ take: 3 });
    console.log('\nSample mappings:');
    sample.forEach(s => console.log(`  ${s.iec_municipality_id}: ${s.municipality_code} (district: ${s.district_code})`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateMappings();

