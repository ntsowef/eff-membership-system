/**
 * Simple Benchmark Data Generator
 * Creates test files without database lookups
 */

import XLSX from 'xlsx';
import path from 'path';

// Sample data
const firstNames = ['Thabo', 'Sipho', 'Lerato', 'Nomsa', 'Bongani', 'Zanele', 'Mpho', 'Tebogo', 'Sello', 'Lindiwe'];
const surnames = ['Nkosi', 'Dlamini', 'Khumalo', 'Mthembu', 'Sithole', 'Ndlovu', 'Zulu', 'Mokoena', 'Naicker', 'Fourie'];

// Real valid values from database (queried from actual database)
const provinces = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Limpopo'];
const municipalities = ['City of Johannesburg', 'City of Cape Town', 'eThekwini', 'City of Tshwane', 'Ekurhuleni'];
// Real ward codes from database
const wards = ['21507018', '21507019', '21507020', '21507021', '21507022', '21507023', '21507024', '21507025', '21507026', '21507027'];
// Real 8-digit VD codes from database (excluding special codes)
const vdCodes = ['10100001', '10100002', '10100003', '10100004', '10100005', '10100006', '10100007', '10100008', '10100009', '10100010'];

// Generate valid SA ID with Luhn checksum
function generateValidSAID(): string {
  const year = String(Math.floor(Math.random() * 50) + 50).padStart(2, '0');
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const citizenship = '0';
  const race = '8';

  const idWithoutChecksum = `${year}${month}${day}${sequence}${citizenship}${race}`;
  const checksum = calculateLuhnChecksum(idWithoutChecksum);

  return `${idWithoutChecksum}${checksum}`;
}

/**
 * Calculate Luhn checksum digit
 * Based on the working algorithm from idValidationService.ts
 *
 * Algorithm:
 * 1. Sum all digits at odd positions (0, 2, 4, 6, 8, 10)
 * 2. For digits at even positions (1, 3, 5, 7, 9, 11):
 *    - Double the digit
 *    - If result > 9, subtract 9
 *    - Add to sum
 * 3. Calculate checksum digit that makes (sum + checksum) % 10 == 0
 */
function calculateLuhnChecksum(id: string): number {
  if (id.length !== 12) {
    throw new Error('ID without checksum must be 12 digits');
  }

  const digits = id.split('').map(d => parseInt(d, 10));
  let sum = 0;

  // Process odd positions (0, 2, 4, 6, 8, 10)
  for (let i = 0; i < 12; i += 2) {
    sum += digits[i];
  }

  // Process even positions (1, 3, 5, 7, 9, 11)
  for (let i = 1; i < 12; i += 2) {
    let doubled = digits[i] * 2;
    if (doubled > 9) {
      doubled -= 9;
    }
    sum += doubled;
  }

  // Calculate checksum digit that makes total % 10 == 0
  const checksum = (10 - (sum % 10)) % 10;
  return checksum;
}

// Generate records
function generateRecords(count: number): any[] {
  console.log(`📝 Generating ${count} records...`);
  const records = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    
    records.push({
      'ID Number': generateValidSAID(),
      'Name': firstName,
      'Surname': surname,
      'Cell Number': `0${Math.floor(Math.random() * 900000000) + 100000000}`,
      'Email': `${firstName.toLowerCase()}.${surname.toLowerCase()}${i}@example.com`,
      'Province': provinces[Math.floor(Math.random() * provinces.length)],
      'Municipality': municipalities[Math.floor(Math.random() * municipalities.length)],
      'Ward': wards[Math.floor(Math.random() * wards.length)],
      'VD Code': vdCodes[Math.floor(Math.random() * vdCodes.length)],
      'Last Payment Date': new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      'Membership Amount': Math.random() > 0.5 ? 12 : 60,
      'Payment Method': Math.random() > 0.5 ? 'Cash' : 'EFT',
      'Gender': Math.random() > 0.5 ? 'Male' : 'Female',
      'Race': 'Black African',
      'Language': 'English',
      'Residential Address': `${Math.floor(Math.random() * 1000)} Main Street`,
      'Occupation': 'Employed',
      'Qualification': 'Matric',
      'Subscription': 'Monthly'
    });
    
    if ((i + 1) % 100 === 0) {
      console.log(`   Generated ${i + 1}/${count} records...`);
    }
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
}

// Main
async function main() {
  console.log('🚀 Simple Benchmark Data Generator');
  console.log('='.repeat(80));
  console.log('');
  
  const sizes = [100, 500, 1000, 5000];
  
  for (const size of sizes) {
    console.log(`\n📊 Generating ${size} records...`);
    const records = generateRecords(size);
    const filename = `benchmark-${size}-records.xlsx`;
    createExcelFile(records, filename);
  }
  
  console.log('');
  console.log('🎉 All benchmark files generated!');
  console.log('');
  console.log('Generated files:');
  sizes.forEach(size => {
    console.log(`  - benchmark-${size}-records.xlsx`);
  });
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

