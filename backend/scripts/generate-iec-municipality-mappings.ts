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

interface InternalMunicipality {
  municipality_code: string;
  municipality_name: string;
  district_code: string | null;
}

async function generateMappings() {
  try {
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
      select: {
        municipality_code: true,
        municipality_name: true,
        district_code: true
      }
    });
    console.log(`Found ${internalMunis.length} internal municipalities\n`);

    // 3. Get province mappings
    const provinceMappings = await prisma.iec_province_mappings.findMany();
    const provinceIdToCode = new Map(provinceMappings.map(p => [p.iec_province_id, p.province_code]));

    // 4. Try to match IEC municipalities to internal ones
    const mappings: any[] = [];
    const unmatched: IECMunicipality[] = [];

    for (const [id, iec] of iecMunicipalities) {
      const provinceCode = provinceIdToCode.get(iec.iec_province_id);
      if (!provinceCode) {
        console.log(`Warning: No province mapping for IEC Province ID ${iec.iec_province_id}`);
        continue;
      }

      // Try to find matching internal municipality
      // IEC names are like "NMA - Nelson Mandela Bay" or "EC102 - Blue Crane Route"
      const iecNameParts = iec.iec_municipality_name.split(' - ');
      const iecCode = iecNameParts[0].trim();
      const iecFullName = iecNameParts.length > 1 ? iecNameParts[1].trim() : iec.iec_municipality_name;

      // FIRST: Try to match by code (most reliable)
      let match = internalMunis.find(m => m.municipality_code === iecCode);

      // SECOND: Try to match by name similarity if code didn't match
      if (!match) {
        match = internalMunis.find(m => {
          const internalName = m.municipality_name.toLowerCase();
          const iecLower = iecFullName.toLowerCase();
          // Check if names match (allowing for "Sub-Region" suffix)
          return internalName.includes(iecLower) ||
                 iecLower.includes(internalName.replace(' sub-region', '').replace('sub-region of ', ''));
        });
      }

      if (match) {
        mappings.push({
          municipality_code: match.municipality_code,
          municipality_name: match.municipality_name,
          province_code: provinceCode,
          iec_municipality_id: id.toString(),
          iec_municipality_name: iec.iec_municipality_name,
          iec_province_id: iec.iec_province_id,
          district_code: match.district_code
        });
      } else {
        unmatched.push(iec);
      }
    }

    console.log(`Matched: ${mappings.length}`);
    console.log(`Unmatched: ${unmatched.length}\n`);

    // Show unmatched for debugging
    if (unmatched.length > 0) {
      console.log('Unmatched IEC municipalities:');
      unmatched.slice(0, 20).forEach(u => {
        console.log(`  - ${u.iec_municipality_id}: ${u.iec_municipality_name} (Province ${u.iec_province_id})`);
      });
    }

    // 5. Save mappings to JSON for review
    const outputPath = path.join(__dirname, '../../reports/iec_municipality_mappings.json');
    require('fs').writeFileSync(outputPath, JSON.stringify({ matched: mappings, unmatched }, null, 2));
    console.log(`\nMappings saved to: ${outputPath}`);

    // Show sample matched
    console.log('\nSample matched mappings:');
    mappings.slice(0, 5).forEach(m => {
      console.log(`  IEC ${m.iec_municipality_id} (${m.iec_municipality_name}) -> ${m.municipality_code} (district: ${m.district_code})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateMappings();

