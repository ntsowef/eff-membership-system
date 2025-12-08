/**
 * Generate Benchmark Test Data
 * 
 * Creates Excel files with varying numbers of records for performance testing:
 * - 100 records
 * - 500 records
 * - 1000 records
 * - 5000 records
 * 
 * Each file contains a mix of:
 * - Valid SA ID numbers (with correct Luhn checksum)
 * - Mix of new and existing members
 * - All required columns for database insertion
 */

import XLSX from 'xlsx';
import path from 'path';
import { Pool } from 'pg';

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

// Sample data arrays
const firstNames = ['Thabo', 'Sipho', 'Lerato', 'Nomsa', 'Bongani', 'Zanele', 'Mpho', 'Tebogo', 'Sello', 'Lindiwe', 
                    'Mandla', 'Nandi', 'Jabu', 'Precious', 'Lucky', 'Beauty', 'Gift', 'Blessing', 'Hope', 'Faith'];
const surnames = ['Nkosi', 'Dlamini', 'Khumalo', 'Mthembu', 'Sithole', 'Ndlovu', 'Zulu', 'Mokoena', 'Naicker', 'Fourie',
                  'Mahlangu', 'Ngcobo', 'Buthelezi', 'Cele', 'Mkhize', 'Radebe', 'Shabalala', 'Ntuli', 'Khoza', 'Vilakazi'];

// Generate valid SA ID number with Luhn checksum
function generateValidSAID(): string {
  // Generate date of birth (YYMMDD)
  const year = Math.floor(Math.random() * 50) + 50; // 1950-1999
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  
  // Generate sequence number (0000-9999)
  const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  
  // Citizenship (0 = SA citizen, 1 = permanent resident)
  const citizenship = '0';
  
  // Race (no longer used, always 8)
  const race = '8';
  
  // Build ID without checksum
  const idWithoutChecksum = `${year}${month}${day}${sequence}${citizenship}${race}`;
  
  // Calculate Luhn checksum
  const checksum = calculateLuhnChecksum(idWithoutChecksum);
  
  return `${idWithoutChecksum}${checksum}`;
}

// Calculate Luhn checksum
function calculateLuhnChecksum(id: string): number {
  let sum = 0;
  let isEven = false;
  
  // Process from right to left
  for (let i = id.length - 1; i >= 0; i--) {
    let digit = parseInt(id[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return (10 - (sum % 10)) % 10;
}

// Get valid lookup values from database
async function getValidLookupValues() {
  console.log('📊 Fetching valid lookup values from database...');
  
  const [provinces, municipalities, wards, votingDistricts] = await Promise.all([
    pool.query('SELECT province_code, province_name FROM provinces LIMIT 5'),
    pool.query('SELECT municipality_code, municipality_name FROM municipalities LIMIT 10'),
    pool.query('SELECT ward_code, ward_name FROM wards LIMIT 20'),
    pool.query('SELECT voting_district_code, voting_district_name FROM voting_districts WHERE LENGTH(voting_district_code) = 8 LIMIT 50')
  ]);
  
  return {
    provinces: provinces.rows,
    municipalities: municipalities.rows,
    wards: wards.rows,
    votingDistricts: votingDistricts.rows
  };
}

// Generate test records
async function generateRecords(count: number, lookupData: any): Promise<any[]> {
  console.log(`📝 Generating ${count} test records...`);
  
  const records = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const idNumber = generateValidSAID();
    
    // Random lookup values
    const province = lookupData.provinces[Math.floor(Math.random() * lookupData.provinces.length)];
    const municipality = lookupData.municipalities[Math.floor(Math.random() * lookupData.municipalities.length)];
    const ward = lookupData.wards[Math.floor(Math.random() * lookupData.wards.length)];
    const vd = lookupData.votingDistricts[Math.floor(Math.random() * lookupData.votingDistricts.length)];
    
    records.push({
      'ID Number': idNumber,
      'Name': firstName,
      'Surname': surname,
      'Cell Number': `0${Math.floor(Math.random() * 900000000) + 100000000}`,
      'Email': `${firstName.toLowerCase()}.${surname.toLowerCase()}@example.com`,
      'Province': province.province_name,
      'Municipality': municipality.municipality_name,
      'Ward': ward.ward_name,
      'VD Code': vd.voting_district_code,
      'Last Payment Date': new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      'Membership Amount': Math.random() > 0.5 ? 12 : 60,
      'Payment Method': Math.random() > 0.5 ? 'Cash' : 'EFT',
      'Gender': Math.random() > 0.5 ? 'Male' : 'Female',
      'Race': ['Black African', 'Coloured', 'Indian/Asian', 'White'][Math.floor(Math.random() * 4)],
      'Language': ['English', 'Zulu', 'Xhosa', 'Afrikaans', 'Sotho'][Math.floor(Math.random() * 5)],
      'Residential Address': `${Math.floor(Math.random() * 1000)} Main Street, ${municipality.municipality_name}`,
      'Occupation': ['Student', 'Employed', 'Self-Employed', 'Unemployed'][Math.floor(Math.random() * 4)],
      'Qualification': ['Matric', 'Diploma', 'Degree', 'Postgraduate'][Math.floor(Math.random() * 4)],
      'Subscription': 'Monthly'
    });
  }
  
  return records;
}

// Create Excel file
function createExcelFile(records: any[], filename: string) {
  console.log(`📄 Creating Excel file: ${filename}`);

  const worksheet = XLSX.utils.json_to_sheet(records);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');

  const outputPath = path.resolve(process.cwd(), '..', 'test', 'bulk-upload-integration', filename);
  XLSX.writeFile(workbook, outputPath);

  console.log(`✅ Created: ${outputPath}`);
  return outputPath;
}

// Main function
async function main() {
  console.log('🚀 Benchmark Test Data Generator');
  console.log('='.repeat(80));
  console.log('');
  
  try {
    // Get valid lookup values
    const lookupData = await getValidLookupValues();
    console.log('✅ Lookup values fetched');
    console.log('');
    
    // Generate test files
    const sizes = [100, 500, 1000, 5000];
    
    for (const size of sizes) {
      console.log(`\n📊 Generating ${size} records...`);
      const records = await generateRecords(size, lookupData);
      const filename = `benchmark-${size}-records.xlsx`;
      createExcelFile(records, filename);
    }
    
    console.log('');
    console.log('🎉 All benchmark test files generated successfully!');
    console.log('');
    console.log('Generated files:');
    sizes.forEach(size => {
      console.log(`  - benchmark-${size}-records.xlsx`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

